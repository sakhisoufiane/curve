import { Schema } from 'avsc';
import moment from 'moment';
import { BigQuerySchema, BigQuerySchemaField } from '../client/bigquery-client';

/**
 * Given a BigQuery schema, convert this into an equivalent Avro schema, so that the Avro data
 * will be accepted for upload to the table with that schema
 * @param bigQuerySchema The BigQuery schema
 */
export function convertBigQuerySchemaToAvroSchema(bigQuerySchema: BigQuerySchema): Schema {
  return {
    type: 'record',
    name: 'dynamic',
    fields: bigQuerySchema.map((field) => bqFieldToAvroField(field)),
  };
}

/**
 * Convert a given field to it's Avro equivalent
 * @param field The field details
 */
function bqFieldToAvroField(field: BigQuerySchemaField): { name: string; type: Schema, default: unknown } {
  let avroType;
  switch (field.type) {
    case 'STRING':
      avroType = 'string';
      break;
    case 'BYTES':
      avroType = 'bytes';
      break;
    case 'INTEGER':
    case 'INT64':
      avroType = 'long';
      break;
    case 'FLOAT':
    case 'FLOAT64':
      avroType = 'double';
      break;
    case 'BOOLEAN':
      avroType = 'boolean';
      break;
    case 'TIMESTAMP':
      avroType = timestamp;
      break;
    case 'DATE':
      avroType = date;
      break;
    case 'TIME':
      avroType = time;
      break;
    case 'DATETIME':
      avroType = 'string';
      break;
    case 'RECORD':
      avroType = createRecord(field);
      break;
    default:
      throw new Error(`Unhandled type: ${field.type}`);
  }

  // Handle mode (NULLABLE, REPEATED, REQUIRED)
  let defaultValue;
  if (field.mode === 'REPEATED') {
    avroType = convertToArray(avroType);
    defaultValue = [];
  } else if (field.mode === 'NULLABLE' || !field.mode) {
    avroType = convertToNullable(avroType);
    defaultValue = null;
  }

  return { name: field.name, type: avroType, default: defaultValue };
}

const timestamp: LogicalType = { type: 'long', logicalType: 'timestamp-micros' };
const date: LogicalType = { type: 'int', logicalType: 'date' };
const time: LogicalType = { type: 'long', logicalType: 'time-micros' };

const createRecord = (field: BigQuerySchemaField): RecordType => ({
  type: 'record',
  name: field.name,
  fields: field.fields?.map((f) => bqFieldToAvroField(f)) ?? [],
});

const convertToArray = (innerType: Schema): ArrayType => ({ type: 'array', items: innerType });
const convertToNullable = (innerType: Schema): DefinedType[] => (['null', innerType as DefinedType]);

/**
 * Given an object that could be serialized to JSON and uploaded to BigQuery, this function mutates
 * the data so that it's compatible with the equivalent Avro schema
 * @param object The object to convert
 * @param schema The schema to coerce the object to fit
 */
export function convertRecordToAvro(object: { [key: string]: unknown }, schema: RecordType): { [key: string]: unknown } {
  const out: { [key: string]: unknown } = {};
  for (const field of schema.fields) {
    const value = object[field.name];
    out[field.name] = convertOne(value, field.type);
  }
  return out;
}

/**
 * Convert a given value into the Avro equivalent
 * @param value The value to convert
 * @param field The Field information in Avro
 */
function convertOne(
  value: unknown,
  field: Schema
): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const { baseType, logicalType } = unwrapType(field);

  switch (logicalType || baseType) {
    case 'date': {
      if (typeof value !== 'string') {
        throw new Error(`Expected string for Date input: ${value} for base type: ${baseType}, logical type: ${logicalType}`);
      }

      const date = moment.utc(value, moment.ISO_8601, true);
      if (!date.isValid()) throw new Error(`Invalid DATE: ${value}`);
      return Math.floor(date.valueOf() / 86400000);
    }
    case 'timestamp-micros': {
      if (typeof value !== 'string') {
        throw new Error(`Expected string for Timestamp input: ${value} for base type: ${baseType}, logical type: ${logicalType}`);
      }

      const date = moment.utc(value, moment.ISO_8601, true);
      if (!date.isValid()) throw new Error(`Invalid TIMESTAMP: ${value}`);
      return BigInt(date.valueOf()) * 1000n;
    }
    case 'time-micros': {
      if (typeof value !== 'string') {
        throw new Error(`Expected string for Time input: ${value} for base type: ${baseType}, logical type: ${logicalType}`);
      }

      const match = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(value);
      if (!match) throw new Error(`Invalid TIME: ${value}`);
      const [, hh, mm, ss, fraction] = match;
      const hours = parseInt(hh as string, 10);
      const minutes = parseInt(mm as string, 10);
      const seconds = parseInt(ss as string, 10);
      const micros = fraction ? parseInt(fraction.padEnd(6, '0'), 10) : 0;
      return (hours * 3600 + minutes * 60 + seconds) * 1_000_000 + micros;
    }
    case 'string': {
      return String(value);
    }
    case 'long':
    case 'int': {
      return Number(value);
    }
    case 'double':
    case 'float': {
      return Number(value);
    }
    case 'boolean': {
      return Boolean(value);
    }
    case 'record': {
      if (typeof value !== 'object') {
        throw new Error(`Expected object for Record input: ${value} for base type: ${baseType}, logical type: ${logicalType}`);
      }

      return convertRecordToAvro(value as { [key: string]: unknown }, field as RecordType);
    }
    case 'array': {
      const arrayType = (field as ArrayType);
      const arrayValue = value as { [key: string]: unknown }[];

      return arrayValue.map(v => convertOne(v, arrayType.items));
    }
    default: {
      return value;
    }
  }
}

function unwrapType(type: Schema): { baseType: string; logicalType?: string; } {
  if (Array.isArray(type)) {
    const nonNull = type.find(t => t !== 'null');
    return unwrapType(nonNull as Schema);
  }
  if (typeof type === 'string') {
    return { baseType: type.toLowerCase() };
  }
  if (isLogical(type)) {
    return { baseType: type.type.toLowerCase(), logicalType: type.logicalType };
  }
  if (isComplex(type)) {
    return { baseType: type.type };
  }
  throw new Error(`Unknown type: ${type}`);
}

function isComplex(obj: unknown): obj is ComplexType {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}

function isLogical(obj: unknown): obj is LogicalType {
  return typeof obj === 'object' && obj !== null && 'logicalType' in obj;
}

//
// Internal Avro types, to help with mapping
//
type DefinedType = PrimitiveType | ComplexType | LogicalType | string;
type PrimitiveType = 'null' | 'boolean' | 'int' | 'long' | 'float' | 'double' | 'bytes' | 'string';
type ComplexType = NamedType | RecordType | EnumType | MapType | ArrayType | FixedType;
type LogicalType = ComplexType & LogicalTypeExtension;

interface NamedType {
  type: PrimitiveType;
}

export interface RecordType {
  type: 'record' | 'error';
  name: string;
  namespace?: string;
  doc?: string;
  aliases?: string[];
  fields: {
    name: string;
    doc?: string;
    type: Schema;
    default?: unknown;
    order?: 'ascending' | 'descending' | 'ignore';
  }[];
}

interface EnumType {
  type: 'enum';
  name: string;
  namespace?: string;
  aliases?: string[];
  doc?: string;
  symbols: string[];
  default?: string;
}

interface ArrayType {
  type: 'array';
  items: Schema;
}

interface MapType {
  type: 'map';
  values: Schema;
}

interface FixedType {
  type: 'fixed';
  name: string;
  aliases?: string[];
  size: number;
}
interface LogicalTypeExtension {
  logicalType: string;
  [param: string]: unknown;
}