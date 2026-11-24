import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { CheckboxField, ComboboxWithClear, Input, Textarea } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type CompanyFormData } from '@/api/companies';
import { useReportsQuery } from '@/hooks/companies/useReportsQuery';
import { useUserStore } from '@/stores/user.store';
import { useClientStore } from '@/stores/client.store';
import { COSTS_REPORT_TABLE, SALES_REPORT_TABLES, STATEMENT_HEADER_TYPES } from '../utils/companies.constants';
import {
  buildReportSelectItems,
  getStatementDesigns,
  shouldShowCostsReport,
} from '../utils/companies.statementOptions';

export function StatementDetailsSection({ disabled, isLoading }: { disabled?: boolean; isLoading?: boolean }) {
  const { t } = useTranslation('companies');
  const { register, setValue, control } = useFormContext<CompanyFormData>();

  const isInternalUser = useUserStore((s) => s.internalUser);
  const clientType = useClientStore((s) => s.clientType);

  const statementDesign = useWatch({ control, name: 'statementDesign' }) ?? '';
  const statementHeaderType = useWatch({ control, name: 'statementHeaderType' }) ?? '';
  const salesReportTemplate = useWatch({ control, name: 'salesReportTemplate' }) ?? '';
  const costsReportTemplate = useWatch({ control, name: 'costsReportTemplate' }) ?? '';
  const statementIncludeTotalsRow = useWatch({ control, name: 'statementIncludeTotalsRow' }) ?? false;
  const suppressZeroValueInExport = useWatch({ control, name: 'suppressZeroValueInExport' }) ?? false;
  const suppressStatementOfAccount = useWatch({ control, name: 'suppressStatementOfAccount' }) ?? false;
  const displaySeparatedDeductions = useWatch({ control, name: 'displaySeparatedDeductions' }) ?? false;

  const { data: reportsData } = useReportsQuery();
  const reports = reportsData?.reports;

  const salesReportItems = useMemo(() => buildReportSelectItems(reports, SALES_REPORT_TABLES), [reports]);
  const costsReportItems = useMemo(() => buildReportSelectItems(reports, [COSTS_REPORT_TABLE]), [reports]);

  const statementDesigns = getStatementDesigns(isInternalUser);
  const showCostsReport = shouldShowCostsReport(isInternalUser, clientType);

  return (
    <FormSection title={t('edit.statementDetails.title')}>
      {isLoading ? (
        <FormGridSkeleton cols={2} count={6} />
      ) : (
        <>
          <FormField label={t('edit.fields.companyName.label')}>
            <Input {...register('companyName')} disabled={disabled} />
          </FormField>
          <FormField label={t('edit.fields.address.label')}>
            <Textarea {...register('address')} disabled={disabled} />
          </FormField>
          <FormField label={t('edit.fields.email.label')}>
            <Input {...register('email')} disabled={disabled} />
          </FormField>
          <FormField
            label={t('edit.fields.statementCustomText.label')}
            hint={t('edit.fields.statementCustomText.hint')}
          >
            <Textarea {...register('statementCustomText')} disabled={disabled} />
          </FormField>
          <FormField
            label={t('edit.fields.statementOfAccountCustomText.label')}
            hint={t('edit.fields.statementOfAccountCustomText.hint')}
          >
            <Textarea {...register('statementOfAccountCustomText')} disabled={disabled} />
          </FormField>
          <FormField label={t('edit.fields.selfBillingTaxText.label')} hint={t('edit.fields.selfBillingTaxText.hint')}>
            <Input {...register('selfBillingTaxText')} disabled={disabled} />
          </FormField>
          <FormField
            label={t('edit.fields.selfBillingTaxCustomText.label')}
            hint={t('edit.fields.selfBillingTaxCustomText.hint')}
          >
            <Textarea {...register('selfBillingTaxCustomText')} disabled={disabled} />
          </FormField>
          <FormField label={t('edit.fields.vatNo.label')}>
            <Input {...register('vatNo')} disabled={disabled} />
          </FormField>

          <FormGrid cols={2}>
            <FormField label={t('edit.fields.statementDesign.label')}>
              <ComboboxWithClear
                fullWidth
                items={statementDesigns.map((d) => ({ label: d, value: d }))}
                placeholder={t('edit.selectPlaceholder')}
                value={statementDesign}
                selectedValue={statementDesign}
                onSelect={(v) => setValue('statementDesign', v, { shouldDirty: true })}
                onClear={() => setValue('statementDesign', '', { shouldDirty: true })}
                disabled={disabled}
              />
            </FormField>
            <FormField label={t('edit.fields.statementHeaderType.label')}>
              <ComboboxWithClear
                fullWidth
                items={STATEMENT_HEADER_TYPES.map((d) => ({ label: d, value: d }))}
                placeholder={t('edit.selectPlaceholder')}
                value={statementHeaderType}
                selectedValue={statementHeaderType}
                onSelect={(v) => setValue('statementHeaderType', v, { shouldDirty: true })}
                onClear={() => setValue('statementHeaderType', '', { shouldDirty: true })}
                disabled={disabled}
              />
            </FormField>
          </FormGrid>

          {isInternalUser && (
            <FormGrid cols={2}>
              <FormField label={t('edit.fields.salesReportTemplate.label')}>
                <ComboboxWithClear
                  fullWidth
                  items={salesReportItems}
                  placeholder={t('edit.selectPlaceholder')}
                  value={salesReportItems.find((i) => i.value === salesReportTemplate)?.label ?? ''}
                  selectedValue={salesReportTemplate}
                  onSelect={(v) => setValue('salesReportTemplate', v, { shouldDirty: true })}
                  onClear={() => setValue('salesReportTemplate', '', { shouldDirty: true })}
                  disabled={disabled}
                />
              </FormField>
              {showCostsReport && (
                <FormField label={t('edit.fields.costsReportTemplate.label')}>
                  <ComboboxWithClear
                    fullWidth
                    items={costsReportItems}
                    placeholder={t('edit.selectPlaceholder')}
                    value={costsReportItems.find((i) => i.value === costsReportTemplate)?.label ?? ''}
                    selectedValue={costsReportTemplate}
                    onSelect={(v) => setValue('costsReportTemplate', v, { shouldDirty: true })}
                    onClear={() => setValue('costsReportTemplate', '', { shouldDirty: true })}
                    disabled={disabled}
                  />
                </FormField>
              )}
            </FormGrid>
          )}

          <div className="space-y-3">
            <CheckboxField
              id="statementIncludeTotalsRow"
              label={t('edit.fields.statementIncludeTotalsRow.label')}
              checked={statementIncludeTotalsRow}
              onCheckedChange={(v) => setValue('statementIncludeTotalsRow', v, { shouldDirty: true })}
              disabled={disabled}
            />
            <CheckboxField
              id="suppressZeroValueInExport"
              label={t('edit.fields.suppressZeroValueInExport.label')}
              checked={suppressZeroValueInExport}
              onCheckedChange={(v) => setValue('suppressZeroValueInExport', v, { shouldDirty: true })}
              disabled={disabled}
            />
            <CheckboxField
              id="suppressStatementOfAccount"
              label={t('edit.fields.suppressStatementOfAccount.label')}
              checked={suppressStatementOfAccount}
              onCheckedChange={(v) => setValue('suppressStatementOfAccount', v, { shouldDirty: true })}
              disabled={disabled}
            />
            <CheckboxField
              id="displaySeparatedDeductions"
              label={t('edit.fields.displaySeparatedDeductions.label')}
              description={t('edit.fields.displaySeparatedDeductions.hint')}
              checked={displaySeparatedDeductions}
              onCheckedChange={(v) => setValue('displaySeparatedDeductions', v, { shouldDirty: true })}
              disabled={disabled}
            />
          </div>

          {displaySeparatedDeductions && (
            <FormField label={t('edit.fields.customDeductionName.label')}>
              <Input {...register('customDeductionName')} disabled={disabled} />
            </FormField>
          )}
        </>
      )}
    </FormSection>
  );
}
