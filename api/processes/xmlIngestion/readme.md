# XML Ingestion / DDEX Catalogue Ingest

This process handles the ingestion of DDEX XML catalogue files from client specific FTP/SFTP.  
It processes the XML files, extracts relevant data, and updates the catalogue accordingly.  

## Settings

Settings for Catalogue Ingestion can be found in Curve frontend `Settings>Integrations & FTP` on the `Catalogue FTP` tab.  
Ingestion supports both FTP and SFTP. It is important that the `Root Directory` contains the full path to the file, for example: `/curve-sftp/client/batch`
where the expected folder structure within a batch looks as follows:
curve_sftp/  
  └─ client/  
    └──20250925224409959/  
      └───BatchComplete_20250925224409959.xml  
      └───840471803881/  
        └─────840471803881.xml  

## Code

The Catalogue Ingest code is an API Process, found here `processes/xmlIngestion`.
When running locally or debugging, the files of interest are:
* `processes/xmlIngestion/xmlRunner.js`
* `processes/xmlIngestion/xmlRunnerTypes.js`
* `processes/xmlIngestion/index.js`

### Debug

* Make a temporary change to `xmlRunnerTypes` and replace the `Client.find` with a specific find for the Client ID being tested: `client.find({ _id: ‘6908b8d8f7e397f66240ed61’ })`
* Run `node processes/xmlIngestion/xmlRunner.js` in terminal to run ingest process
* Optionally comment out `generalIngestionFeeds` as its not usually required
* Following a successful ingest check the Clients catalogue to confirm Releases and Tracks were imported

### Notes

* Files must be on the SFTP/FTP server ready for ingest
* After a successful run the files will be deleted, so keep a copy if intending to run multiple tests
* FTP/SFTP credentials will be required


### Known Issues

* The xml file delete fails because it is using `rmdir` which works only on directories
* The rmdir on the xml folder does work, and removes the xml file, but it still returns an error because the directory isn’t empty (even though the recursive flag is passed to params) - known issue with the library SFTP
* All files and folders will still be correctly deleted, but these errors polute the logs