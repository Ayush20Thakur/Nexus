import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import type { Report, ReportCategory } from '@/types';
import { operationsApi } from '@/api/operations';

function isoDateOffset(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [searchParams] = useSearchParams();
  const { reports, generateReport } = useOperationsStore();
  const { success, error } = useToast();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState(searchParams.get('action') === 'new');

  const [repTitle, setRepTitle] = useState('');
  const [repCategory, setRepCategory] = useState<ReportCategory>('EXECUTIVE');
  const [repFormat, setRepFormat] = useState<Report['format']>('PDF');
  const [dateFrom, setDateFrom] = useState(() => isoDateOffset(-13));
  const [dateTo, setDateTo] = useState(() => isoDateOffset(0));
  const featuredReport = reports[0];

  const handleDownload = async (report?: Report) => {
    if (!report) return;
    setDownloadingId(report.id);
    try {
      const blob = await operationsApi.downloadReport(report.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${report.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Download Complete', `${report.title} (${report.format}) saved.`);
    } catch {
      error('Download Failed', 'The backend could not generate this report download.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repTitle) return;

    try {
      const rep = await generateReport(repTitle, repCategory, repFormat, {
        from: dateFrom,
        to: dateTo,
      });

      setCustomModalOpen(false);
      setRepTitle('');
      success('Report Generated', `"${rep.title}" is ready for download.`);
    } catch {
      error('Report Not Generated', 'The backend rejected the report request.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Export operational intelligence, executive dossiers, and compliance audits"
      >
        <Button
          variant="primary"
          onClick={() => setCustomModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
        >
          Generate Custom Report
        </Button>
      </PageHeader>

      <GlassCard className="p-6 bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container flex flex-col md:flex-row md:items-center justify-between gap-6 border-primary/20 shadow-glass-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-glow-primary">
            <span className="material-symbols-outlined text-primary text-[32px]">
              download_for_offline
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-label-caps font-label-caps bg-primary/20 text-primary font-bold">
                {featuredReport?.category ?? 'REPORT'}
              </span>
              <span className="text-metadata font-metadata text-on-surface-variant">
                {featuredReport ? `${featuredReport.dateRange.from} to ${featuredReport.dateRange.to}` : 'No generated reports'}
              </span>
            </div>
            <h3 className="text-section-title font-section-title text-on-surface">
              {featuredReport?.title ?? 'Generate a Report'}
            </h3>
            <p className="text-body-sm font-body-sm text-on-surface-variant max-w-xl">
              {featuredReport?.description ?? 'Create a report from the connected database to enable downloads.'}
            </p>
          </div>
        </div>

        <Button
          id="global-download-report-btn"
          variant="primary"
          size="lg"
          leftIcon={<span className="material-symbols-outlined text-[22px]">download</span>}
          onClick={() => handleDownload(featuredReport)}
          loading={downloadingId === featuredReport?.id}
          disabled={!featuredReport}
          className="shrink-0 px-8 py-3.5 shadow-glow-primary"
        >
          DOWNLOAD
        </Button>
      </GlassCard>

      <div className="space-y-4">
        <h2 className="text-section-title font-section-title text-on-surface">Generated Reports Archive</h2>
        <div className="grid grid-cols-1 gap-4">
          {reports.map((rep) => (
            <GlassCard
              key={rep.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/10">
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
                    {rep.format === 'PDF' ? 'picture_as_pdf' : rep.format === 'CSV' ? 'csv' : 'table_chart'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-label-caps font-label-caps text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                      {rep.category}
                    </span>
                    <span className="font-mono-data text-mono-data text-primary font-bold text-[11px]">
                      {rep.format}
                    </span>
                    <StatusChip
                      status={rep.status === 'GENERATED' ? 'success' : 'warning'}
                      label={rep.status}
                    />
                  </div>
                  <h3 className="text-card-title font-card-title text-on-surface">{rep.title}</h3>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{rep.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-metadata font-metadata text-on-surface font-semibold">
                    {rep.fileSize ?? 'Generated on download'} {rep.pages ? `- ${rep.pages} pages` : ''}
                  </p>
                  <p className="text-metadata font-metadata text-outline">
                    {rep.dateRange.from} to {rep.dateRange.to}
                  </p>
                </div>

                <Button
                  id={`download-btn-${rep.id}`}
                  variant={rep.status === 'GENERATED' ? 'primary' : 'secondary'}
                  size="sm"
                  leftIcon={<span className="material-symbols-outlined text-[18px]">download</span>}
                  disabled={rep.status !== 'GENERATED'}
                  loading={downloadingId === rep.id}
                  onClick={() => handleDownload(rep)}
                >
                  DOWNLOAD
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <Modal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        title="Generate Custom Report"
        subtitle="Specify dataset, format, and date window"
        icon="tune"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <Input
            label="Report Title"
            placeholder="e.g. Q3 Inventory Turnover & SLA Analysis"
            value={repTitle}
            onChange={(e) => setRepTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Category
              </label>
              <select
                value={repCategory}
                onChange={(e) => setRepCategory(e.target.value as ReportCategory)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="EXECUTIVE">Executive Summary</option>
                <option value="INVENTORY">Inventory & Supply Chain</option>
                <option value="REQUESTS">Operational Requests</option>
                <option value="FULFILLMENT">Fulfillment & Transit</option>
                <option value="AI">AI Decision Analytics</option>
                <option value="COMPLIANCE">Compliance & Policy</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Export Format
              </label>
              <select
                value={repFormat}
                onChange={(e) => setRepFormat(e.target.value as Report['format'])}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="PDF">PDF Document (.pdf)</option>
                <option value="CSV">CSV Data Export (.csv)</option>
                <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              required
            />
            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Generate & Download
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
