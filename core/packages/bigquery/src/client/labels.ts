/**
 * Describes labels to be given
 */
export type BigQueryLabels = {
  job_type: string,
  client_id: string,
  [key: string]: string
}

export type LongRunningJobLabels = BigQueryLabels & {
  job_type: 'ingestion' | 'cost_calculation' | 'sales_calculation' | 'statement_generation' | 'custom_report',
  document_id: string,
  sub_process?: string,
}