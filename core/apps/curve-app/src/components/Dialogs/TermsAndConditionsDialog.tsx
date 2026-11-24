import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { useAcceptLegalTerms } from '@/hooks/client/useAcceptLegalTerms';
import { useClientStore } from '../../stores/client.store';
import TOC from './TOC';

export const TermsAndConditionsDialog = () => {
  const { t } = useTranslation('common');
  const { requiresTsAndCsConfirmation, setClientData } = useClientStore();
  const { mutate } = useAcceptLegalTerms({
    onSuccess: () => {
      setClientData({ requiresTsAndCsConfirmation: false });
    },
  });

  return (
    <Dialog open={requiresTsAndCsConfirmation}>
      <DialogContent className="flex flex-col max-w-[90vw]! w-[90vw]! h-5/6">
        <DialogHeader>
          <DialogTitle>{t('termsAndConditions.title')}</DialogTitle>
        </DialogHeader>
        <TOC />
        <DialogFooter className="justify-center!">
          <Button onClick={() => mutate()} className="w-1/3 sm:w-auto">
            {t('termsAndConditions.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
