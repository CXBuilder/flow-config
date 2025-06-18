import { CopyToClipboard } from '@cloudscape-design/components';

export function CopyArnButton({ arn }: { arn?: string }) {
  return (
    <CopyToClipboard
      copyButtonAriaLabel="Copy ARN to clipboard"
      copyErrorText="Failed to copy ARN"
      copySuccessText="Copied"
      textToCopy={arn ?? ''}
      variant="inline"
    />
  );
}
