const FQDN_REGEX = /(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9_-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/;

describe('FTP host FQDN regex', () => {
  const valid = [
    'example.com',
    'sub.example.com',
    'ftp.my-company.co.uk',
    'sftp_server.example.com',
    'my_ftp.example.com',
    'host_with_underscore.domain.net',
  ];

  const invalid = [
    '-example.com',
    'example',
    'example.c',
    '',
    'ex ample.com',
  ];

  valid.forEach((host) => {
    it(`accepts valid FQDN: ${host}`, () => {
      expect(FQDN_REGEX.test(host)).toBe(true);
    });
  });

  invalid.forEach((host) => {
    it(`rejects invalid FQDN: ${host || '(empty)'}`, () => {
      expect(FQDN_REGEX.test(host)).toBe(false);
    });
  });
});
