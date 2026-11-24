const Mapping = require('./mapping');

describe('mapWorkDescription', () => {
  it.each([
    ['POP', 'Pop'],
    ['JAZ', 'Jazz'],
    ['SER', 'Classical'],
    ['UNC', 'Undefined'],
    ['UNKNOWN', null],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapWorkDescription(input)).toBe(expected);
  });
});

describe('mapLanguage', () => {
  it.each([
    ['EN', 'English'],
    ['FR', 'French'],
    ['DE', 'German'],
    ['ES', 'Spanish'],
    ['JA', 'Japanese'],
    ['ZU', 'Zulu'],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapLanguage(input)).toBe(expected);
  });

  it('should return empty string for unknown language code', () => {
    expect(Mapping.mapLanguage('XX')).toBe('');
  });
});

describe('mapVersionType', () => {
  it('should map MOD to Modification', () => {
    expect(Mapping.mapVersionType('MOD')).toBe('Modification');
  });

  it('should default to Original Work for unknown values', () => {
    expect(Mapping.mapVersionType('ORI')).toBe('Original Work');
    expect(Mapping.mapVersionType(undefined)).toBe('Original Work');
  });
});

describe('mapCompositeType', () => {
  it.each([
    ['COS', 'Composite of Samples'],
    ['MED', 'Medley'],
    ['POT', 'Potpourri'],
    ['UCO', 'Unspecified'],
    ['UNKNOWN', null],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapCompositeType(input)).toBe(expected);
  });
});

describe('mapArrangementType', () => {
  it.each([
    ['ORI', 'Original'],
    ['NEW', 'New Music Added'],
    ['ARR', 'Arrangement'],
    ['ADM', 'Addition of Music to Text'],
    ['UNS', 'Unspecified'],
    ['UNKNOWN', null],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapArrangementType(input)).toBe(expected);
  });
});

describe('mapLyricAdaptionType', () => {
  it.each([
    ['ORI', 'Original'],
    ['NON', 'None'],
    ['NEW', 'New Lyrics Added'],
    ['MOD', 'Modification'],
    ['REP', 'Replaced'],
    ['ADL', 'Addition of Lyrics to Music'],
    ['TRA', 'Translation'],
    ['UNS', 'Unspecified'],
    ['UNKNOWN', null],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapLyricAdaptionType(input)).toBe(expected);
  });
});

describe('mapPublisherType', () => {
  it.each([
    ['AM', 'Admin'],
    ['E', 'Original Publisher'],
    ['SE', 'Sub Publisher'],
    ['AQ', 'Acquirer'],
    ['PA', 'Income Participant'],
    ['UNKNOWN', null],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapPublisherType(input)).toBe(expected);
  });
});

describe('mapSociety', () => {
  it('should return the correct society name', () => {
    expect(Mapping.mapSociety(338)).toBe('EDEM');
  });

  it.each([
    [21, 'BMI'],
    [52, 'PRS'],
    [58, 'SACEM'],
    [35, 'GEMA'],
    [10, 'ASCAP'],
    [101, 'SOCAN'],
    [778, 'GMR'],
    [708, 'MLC'],
  ])('should map society code %s to %s', (input, expected) => {
    expect(Mapping.mapSociety(input)).toBe(expected);
  });

  it('should return undefined for unknown society code', () => {
    expect(Mapping.mapSociety(9999)).toBeUndefined();
  });

  it('should return undefined when no code passed', () => {
    expect(Mapping.mapSociety(null)).toBeUndefined();
  });
});

describe('mapComposerType', () => {
  it.each([
    ['A', 'Lyrics'],
    ['C', 'Music'],
    ['CA', 'Lyrics and Music'],
    ['AR', 'Arranger'],
    ['SR', 'Sub Arranger'],
    ['AD', 'Adapter'],
    ['SA', 'Sub Author'],
    ['TR', 'Translator'],
    ['PA', 'Income Participant'],
    ['UNKNOWN', 'Unknown'],
  ])('should map %s to %s', (input, expected) => {
    expect(Mapping.mapComposerType(input)).toBe(expected);
  });
});

describe('mapTerritories', () => {
  it('should return empty array for non-array input', () => {
    expect(Mapping.mapTerritories(null)).toEqual([]);
    expect(Mapping.mapTerritories(undefined)).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(Mapping.mapTerritories([])).toEqual([]);
  });

  it('should include territories with indicator I', () => {
    const result = Mapping.mapTerritories([{ territories: '826', includeExclusionIndicator: 'I' }]);
    expect(result).toContain('GB');
  });

  it('should not include territories with indicator E', () => {
    const result = Mapping.mapTerritories([
      { territories: '528', includeExclusionIndicator: 'I' },
      { territories: '826', includeExclusionIndicator: 'E' },
    ]);
    expect(result).toEqual(['NL']);
    expect(result).not.toContain('GB');
  });

  it('should return WW when territory count meets CISAC threshold', () => {
    // 2136 maps to the full world array (many countries)
    const result = Mapping.mapTerritories([{ territories: '2136', includeExclusionIndicator: 'I' }]);
    expect(result).toEqual(['WW']);
  });
});
