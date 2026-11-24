package com.curve.pojos.input.config.source;

import com.curve.exceptions.ValidationException;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;

import javax.annotation.Nonnull;
import java.io.InputStream;
import java.nio.channels.Channels;

public final class GCSFileSource implements TextIOSupportedFileSource {

    public static final String TYPE = "GCS";

    private final String inputFileBucketLocation;
    private final String inputFileName;

    @JsonCreator
    public GCSFileSource(
            @JsonProperty(value = "inputFileBucketLocation", required = true) @Nonnull String inputFileBucketLocation,
            @JsonProperty(value = "inputFileName", required = true) @Nonnull String inputFileName
    ) {
        this.inputFileBucketLocation = inputFileBucketLocation;
        this.inputFileName = inputFileName;
    }

    public GCSFileSource(@Nonnull String url) throws ValidationException {
        String[] splitUrl = url.split("/");
        if (splitUrl.length < 2) throw new ValidationException("Invalid url for configuration, " + url);

        inputFileBucketLocation = splitUrl[0];
        inputFileName = getFileNameFromSplitUrl(splitUrl);
    }

    @Override
    @Nonnull
    public String getType() {
        return TYPE;
    }

    @Nonnull
    public String getInputFileBucketLocation() {
        return inputFileBucketLocation;
    }

    @Nonnull
    public String getInputFileName() {
        return inputFileName;
    }

    @Nonnull
    @Override
    public InputStream getInputStream() {
        Storage storage = StorageOptions.getDefaultInstance().getService();
        Bucket bucket = storage.get(inputFileBucketLocation);
        Blob blob = bucket.get(inputFileName);
        return Channels.newInputStream(blob.reader());
    }

    @Override
    public String getTextIOURL() {
        return "gs://" + inputFileBucketLocation + "/" + inputFileName;
    }

    private String getFileNameFromSplitUrl(String[] splitUrl) {
        StringBuilder inputFileNameSB = new StringBuilder();
        for (int i = 1; i < splitUrl.length; i++) {
            inputFileNameSB.append(splitUrl[i]).append("/");
        }
        return inputFileNameSB.deleteCharAt(inputFileNameSB.length() - 1).toString();
    }
}
