package com.curve.pojos.input.config.source;

public sealed interface TextIOSupportedFileSource extends FileSource permits GCSFileSource, LocalFileSource {

    String getTextIOURL();

}
