# Apache Beam starter for Java

If you want to clone this repository to start your own project,
you can choose the license you prefer and feel free to delete anything related to the license you are dropping.

## Before you begin

Make sure you have a [Java](https://en.wikipedia.org/wiki/Java_%28programming_language%29) development environment ready.
If you don't, an easy way to install it is with [`sdkman`](https://sdkman.io).

```sh
# Install sdkman.
curl -s "https://get.sdkman.io" | bash

# Make sure you have Java 17 installed.
sdk install java 17.0.5-tem
```

## Source file structure

com.curve.App.java > Main file for Java execution.

com.curve.configuration/ > Directory for storage of settings/configuration

com.curve.pojos/ > Directory for storage of POJOs (Plain Old Java Objects.)

com.curve.transforms/ > Directory for storage of transforms that we can apply to the pipeline at different stages.

com.curve.transforms.functions > Directory for storage of functions that the transformation classes can use to apply changes to the pipeline collections.


## GitHub Actions automated testing

This project already comes with automated testing via [GitHub Actions](https://github.com/features/actions).

To configure it, look at the [`.github/workflows/test.yaml`](.github/workflows/test.yaml) file.

### Important Scripts

It is important to keep this know how somewhere safe. It would be beneficial if eventually automated pipelines ran these scripts on certain triggers using github actions.

##### Local maven run

mvn compile exec:java -Dexec.mainClass=com.curve.App -Dexec.args="--project=curve-staging-354215"

##### Dataflow run

mvn -Pdataflow-runner compile exec:java -Dexec.mainClass=com.curve.App -Dexec.args="--project=curve-staging-354215 --runner=DataflowRunner --region=europe-west2"

#### Build flex template and deploy to GCR/Template storage

gcloud dataflow flex-template build gs://apache-beam-test-sam/templates/processor.json --image-gcr-path=europe-west2-docker.pkg.dev/curve-staging-354215/beam-processor/dataflow/beam-processor:latest --metadata-file=./metadata.json --sdk-language=JAVA --flex-template-base-image=JAVA17 --jar=./target/beam-processor-bundled-0.1.jar --env="FLEX_TEMPLATE_JAVA_MAIN_CLASS=\"com.curve.App\""

#### Run the flex template saved using command line 

gcloud dataflow flex-template run "beam-processor" --template-file-gcs-location="gs://apache-beam-test-sam/templates/processor.json" --region="europe-west2" --project="curve-staging-354215" --parameters inputFileLocation="gs://apache-beam-test-sam/data.csv" --parameters gcsOutputDirectory="gs://apache-beam-test-sam/output/"

#### Run the packaged jar from the command-line

###### With character-separation input schema
mvn package && java -cp ./target/beam-processor-bundled-0.1.jar com.curve.App --inputSchema="[{\"characters\": 3, \"field\": \"Column one\", \"type\": \"String\"},{\"characters\": 10, \"field\": \"Column two\", \"type\": \"String\"},{\"characters\": 7, \"field\": \"test\", \"type\": \"Column three\"}]" --fileReaderSchema="{\"inputFileBucketLocation\": \"apache-beam-test-sam\", \"inputFileName\": \"3_10_7_char_separated.txt\", \"delimiter\": \",\", \"tabs\": [0,1], \"startingRow\": 0, \"startingColumn\": 0, \"encoding\": \"UTF-8\", \"indexSeparated\": \"true\", \"targetCellsString\": \"[{\"field\": \"\", \"dataType\": \"String\", \"cellLocation\": \"A4\"}, {\"field\": \"\", \"dataType\": \"String\", \"cellLocation\": \"B2\"}]\", \"fileType\": \"txt\", \"indexSeparated\": true}"

###### Using Target Cells
mvn package && java -cp ./target/beam-processor-bundled-0.1.jar com.curve.App --fileReaderSchema="{\"inputFileBucketLocation\": \"apache-beam-test-sam\", \"inputFileName\": \"data.csv\", \"startingRow\": 1, \"startingColumn\": 0, \"encoding\": \"UTF-8\", \"indexSeparated\": \"false\", \"targetCellsString\": \"[{\\\"field\\\": \\\"Channel\\\", \\\"dataType\\\": \\\"String\\\", \\\"cellLocation\\\": \\\"A4\\\"}, {\\\"field\\\": \\\"\\\", \\\"dataType\\\": \\\"String\\\", \\\"cellLocation\\\": \\\"B2\\\"}]\", \"fileType\": \"csv\"}"

###### Test Simple Mapping
mvn package && java -cp ./target/beam-processor-bundled-0.1.jar com.curve.App --inputConfig="{\"type\":\"GCS\",\"fileType\":\"xlsx\",\"startingRow\":1,\"startingColumn\":0,\"inputFileBucketLocation\":\"apache-beam-test-sam\",\"inputFileName\":\"simpleMappingTest.xlsx\",\"encoding\":\"UTF-8\",\"tabs\":[0],\"delimiter\":\",\"}" --outputConfig="{\"type\":\"gcs\",\"fileType\":\"csv\",\"bucketName\":\"gs://apache-beam-test-sam/sam-output-test-bucket\",\"fileName\":\"demo1\"}" --outputSchema="[{\"field\":\"outputTerritory\",\"type\":\"VARCHAR\"},{\"field\":\"Territory\",\"type\":\"VARCHAR\"},{\"field\":\"Channel\",\"type\":\"VARCHAR\"},{\"field\":\"SaleDate\",\"type\":\"Date\",\"dateFormat\":\"DD/MM/YYYY\"},{\"field\":\"NetAmount\",\"type\":\"Number\"},{\"field\":\"FiveDP\",\"type\":\"Number5DecimalPlaces\"},{\"field\":\"Channel\",\"type\":\"VARCHAR(5)\"},{\"field\":\"FiveDP\",\"type\":\"NUMERIC(7)\"}]" --transformations="[{\"type\":\"simpleMapping\",\"replaceOutputValue\":true,\"condition\":{\"name\":\"Test\"},\"inputField\":\"Territory\",\"outputField\":\"outputTerritory\",\"algorithm\":\"Simple\",\"mappings\":{\"UK\":\"GB\"}}]" --inputSchema="[{\"field\":\"Territory\",\"type\":\"String\"},{\"field\":\"Channel\",\"type\":\"String\"},{\"field\":\"NetAmount\",\"type\":\"Number\"},{\"field\":\"Enabled\",\"type\":\"Boolean\"},{\"field\":\"SaleDate\",\"type\":\"Date\",\"dateFormat\":\"DD-MMM-YYYY\"},{\"field\":\"Money\",\"type\":\"NumberCommaSeparated\"},{\"field\":\"TwoDP\",\"type\":\"Number2DecimalPlaces\"},{\"field\":\"FiveDP\",\"type\":\"Number5DecimalPlaces\"},{\"field\":\"Territory2\",\"type\":\"String\"}]"

###### Test Hierarchical Mapping
mvn package && java -cp ./target/beam-processor-bundled-0.1.jar com.curve.App --inputConfig="{\"type\":\"GCS\",\"fileType\":\"xlsx\",\"startingRow\":1,\"startingColumn\":0,\"inputFileBucketLocation\":\"apache-beam-test-sam\",\"inputFileName\":\"hierarchicalMappingTest.xlsx\",\"encoding\":\"UTF-8\",\"tabs\":[0]}" --inputSchema="[{\"field\":\"Territory\",\"type\":\"String\"},{\"field\":\"Channel\",\"type\":\"String\"},{\"field\":\"Net Amount\",\"type\":\"Number\"},{\"field\":\"Enabled\",\"type\":\"Boolean\"},{\"field\":\"SaleDate\",\"type\":\"Date\",\"dateFormat\":\"DD-MMM-YYYY\"},{\"field\":\"Money\",\"type\":\"Number Comma Separated\"},{\"field\":\"Two DP\",\"type\":\"Number 2 Decimal Places\"},{\"field\":\"Five DP\",\"type\":\"Number 5 Decimal Places\"},{\"field\":\"Territory2\",\"type\":\"String\"},{\"field\":\"Bad Values\",\"type\":\"String\"},{\"field\":\"Cat No\",\"type\":\"String\"}]" --transformations="[{\"type\":\"HierarchicalMapping\",\"replaceOutputValue\":false,\"inputField\":\"Cat No\",\"outputField\":\"Release Id\",\"context\":[\"Channel\",\"Territory\"],\"mappings\":{\"Physical\":{\"UK\":{\"CATNO01\":\"physical_uk_CATNO01\",\"CATNO02\":\"physical_uk_CATNO02\",\"_default\":\"physical_uk_default_id\"},\"USA\":{\"CATNO01\":\"physical_usa_CATNO01\",\"CATNO02\":\"physical_usa_CATNO02\",\"_default\":\"physical_usa_default_id\"},\"_default\":{\"CATNO01\":\"physical_default_CATNO01\",\"CATNO02\":\"physical_default_CATNO02\",\"_default\":\"physical_default_default_id\"}},\"Digital\":{\"UK\":{\"CATNO01\":\"digital_uk_CATNO01\",\"CATNO02\":\"digital_uk_CATNO02\",\"_default\":\"digital_uk_default_id\"},\"USA\":{\"CATNO01\":\"digital_usa_CATNO01\",\"CATNO02\":\"digital_usa_CATNO02\",\"_default\":\"digital_usa_default_id\"},\"_default\":{\"CATNO01\":\"digital_default_CATNO01\",\"CATNO02\":\"digital_default_CATNO02\",\"_default\":\"digital_default_default_id\"}},\"_default\":{\"UK\":{\"CATNO01\":\"default_uk_CATNO01\",\"CATNO02\":\"default_uk_CATNO02\",\"_default\":\"default_uk_default_id\"},\"USA\":{\"CATNO01\":\"default_usa_CATNO01\",\"CATNO02\":\"default_usa_CATNO02\",\"_default\":\"default_usa_default_id\"},\"_default\":{\"CATNO01\":\"default_default_CATNO01\",\"CATNO02\":\"default_default_CATNO02\",\"_default\":\"default_default_default_id\"}}}}]" --outputSchema="[{\"field\":\"Bad Values\",\"type\":\"VARCHAR\"},{\"field\":\"SaleDate\",\"type\":\"Date\",\"dateFormat\":\"DD/MM/YYYY\"},{\"field\":\"Net Amount\",\"type\":\"Number\"},{\"field\":\"Five DP\",\"type\":\"Number 5 Decimal Places\"},{\"field\":\"Channel\",\"type\":\"VARCHAR(5)\"},{\"field\":\"Five DP\",\"type\":\"NUMERIC(7)\"},{\"field\":\"Channel\",\"type\":\"VARCHAR\"},{\"field\":\"Territory\",\"type\":\"VARCHAR\"},{\"field\":\"Cat No\",\"type\":\"VARCHAR\"},{\"field\":\"Release Id\",\"type\":\"VARCHAR\"}]" --outputConfig="{\"type\":\"gcs\",\"fileType\":\"csv\",\"bucketName\":\"gs://apache-beam-test-sam/sam-output-test-bucket\",\"fileName\":\"demo1\"}"
