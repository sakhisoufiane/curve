interface FileUploadProgressProps {
  progress: number;
}

export const FileUploadProgress = ({ progress }: FileUploadProgressProps) => {
  return (
    <div className="mt-5 text-center text-white">
      {progress === 100 ? (
        <h3 className="my-1 text-lg font-normal">File is Processing...</h3>
      ) : (
        <>
          <h3 className="my-1 text-lg font-normal">File is Uploading...</h3>
          <h3 className="my-1 text-lg font-normal">{progress}%</h3>
        </>
      )}
    </div>
  );
};
