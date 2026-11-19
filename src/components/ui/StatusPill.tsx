import React from 'react';
import { DonkiStatus, OsdrStatus } from '../../game/types';

export interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement> {
  donki?: DonkiStatus;
  osdr?: OsdrStatus;
  compact?: boolean;
}

function formatYearMonth(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function StatusPill({
  donki,
  osdr,
  compact = false,
  className = '',
  ...props
}: StatusPillProps) {
  // Clean DONKI classType (strip redundant archive substrings if present)
  const rawClass = donki?.classType || 'M2.4';
  const cleanClass = rawClass.replace(/\s*\(Archived Reference\)/gi, '').trim() || 'M2.4';

  // Determine DONKI state
  const isDonkiLive = Boolean(donki?.isLive || donki?.status === 'live');
  const isDonkiArchived = donki?.status === 'archived' || (!isDonkiLive && !!cleanClass);
  const donkiDate = formatYearMonth(donki?.beginTime);

  let donkiLabel = 'DONKI OFFLINE';
  if (isDonkiLive) {
    donkiLabel = `DONKI ${cleanClass} LIVE${donkiDate ? ` (${donkiDate})` : ''}`;
  } else if (isDonkiArchived) {
    donkiLabel = `DONKI ${cleanClass} ARCHIVED${donkiDate ? ` (${donkiDate})` : ''}`;
  } else if (donki?.status === 'quiet') {
    donkiLabel = 'DONKI QUIET (No Flares)';
  }

  // Determine OSDR state: "OSDR LIVE" strictly only if live API was fetched/parsed in session
  const osdrCount = osdr?.studies?.length || (osdr?.totalCatalogStudies && osdr.totalCatalogStudies > 0 ? osdr.totalCatalogStudies : 0);
  const isOsdrLive = Boolean(osdr?.isLive && osdrCount > 0);
  const isOsdrArchived = !isOsdrLive && osdrCount > 0;

  let osdrLabel = 'OSDR OFFLINE';
  if (isOsdrLive) {
    osdrLabel = `OSDR LIVE (${osdrCount})`;
  } else if (isOsdrArchived) {
    osdrLabel = `OSDR ARCHIVED (${osdrCount})`;
  }

  // Aggregate telemetry health
  const isLive = isDonkiLive || isOsdrLive;
  const isArchived = !isLive && (isDonkiArchived || isOsdrArchived);

  const dotColor = isLive
    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
    : isArchived
      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
      : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';

  const combinedLabel = compact
    ? `${isLive ? 'LIVE' : isArchived ? 'ARCHIVE' : 'OFFLINE'} · ${donki?.classType || 'M2.4'}`
    : `${donkiLabel} · ${osdrLabel}`;

  const donkiRecordId = donki?.flrID || '2024-05-10T21:15:00-FLR-001';
  const donkiRegion = donki?.activeRegionNum ? `AR${donki.activeRegionNum}` : 'AR13664';
  const donkiTooltipDetail = isDonkiLive
    ? `Live NASA DONKI Feed: ${cleanClass}`
    : `Archived Event Replay · Record: ${donkiRecordId} (${donkiRegion} ${cleanClass})`;

  const tooltipText = `${donkiTooltipDetail}. Biological Repository: ${osdrLabel}. Data delivered via local API proxy.`;

  return (
    <div
      title={tooltipText}
      className={`inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-slate-950/80 px-3 py-1 font-body text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-sm select-none ${className}`}
      {...props}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <span className="font-mono text-[11px] font-medium tracking-tight text-slate-300">
        {combinedLabel}
      </span>
    </div>
  );
}
