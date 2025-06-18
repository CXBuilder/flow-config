import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';

const Loader = () => {
  return (
    <SpaceBetween size={'l'} alignItems="center">
      <Spinner size="large" />
    </SpaceBetween>
  );
};

export default Loader;
