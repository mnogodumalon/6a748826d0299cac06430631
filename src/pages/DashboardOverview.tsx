import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { NightcorePlaylists } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, displayMultiLookup, formatDate } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  useRecordOverlayStack,
  RecordOverlayHost,
  RecordHeader,
} from '@/components/widgets/RecordView';
import { NightcorePlaylistsDetails } from '@/components/details/NightcorePlaylistsDetails';
import { NightcorePlaylistsDialog } from '@/components/dialogs/NightcorePlaylistsDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  KanbanWidget,
  type KanbanCard,
  type KanbanColumn,
} from '@/components/widgets/KanbanWidget';
import {
  ChartWidget,
  type ChartRow,
} from '@/components/widgets/ChartWidget';
import { IconHeadphones, IconStar, IconHeart, IconPlus, IconEdit, IconTrash, IconExternalLink } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

type OverlayItem = { type: 'playlist'; id: string };

// Bewertungsspalten aus Schema
const RATING_COLUMNS: KanbanColumn[] = (LOOKUP_OPTIONS['nightcore_playlists']?.['bewertung'] ?? []).map(o => ({
  key: o.key,
  label: o.label,
}));

// Tone je Bewertung
function toneForRating(key: string | undefined): KanbanCard['tone'] {
  if (key === 'stern_5') return 'success';
  if (key === 'stern_4') return 'primary';
  if (key === 'stern_3') return 'default';
  if (key === 'stern_2') return 'warning';
  return 'destructive';
}

export default function DashboardOverview() {
  const {
    nightcorePlaylists,
    setNightcorePlaylists,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<OverlayItem>();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NightcorePlaylists | undefined>(undefined);
  const [createDefaults, setCreateDefaults] = useState<{ bewertung?: string } | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<NightcorePlaylists | null>(null);

  // Kanban cards
  const kanbanCards = useMemo<KanbanCard[]>(() => {
    return nightcorePlaylists.map(p => {
      const ratingKey = lookupKey(p.fields.bewertung);
      const genreTags = p.fields.genre_tags?.map(t => t.label).join(', ');
      return {
        id: `playlist:${p.record_id}`,
        column: ratingKey ?? 'kein_rating',
        title: p.fields.titel ?? 'Ohne Titel',
        subtitle: [p.fields.plattform?.label, genreTags].filter(Boolean).join(' · ') || undefined,
        tone: toneForRating(ratingKey),
      };
    });
  }, [nightcorePlaylists]);

  // Chart rows für Genre-Verteilung
  const chartRows = useMemo<ChartRow<NightcorePlaylists>[]>(() =>
    nightcorePlaylists.map(p => ({ id: `playlist:${p.record_id}`, data: p })),
    [nightcorePlaylists]
  );

  // Favoriten
  const favoriten = useMemo(
    () => nightcorePlaylists.filter(p => p.fields.favorit === true),
    [nightcorePlaylists]
  );

  // Top-Playlists (stern_5 und stern_4)
  const topPlaylists = useMemo(
    () => nightcorePlaylists.filter(p => {
      const k = lookupKey(p.fields.bewertung);
      return k === 'stern_5' || k === 'stern_4';
    }),
    [nightcorePlaylists]
  );

  // KPIs
  const totalCount = nightcorePlaylists.length;
  const favCount = favoriten.length;
  const avgSongs = useMemo(() => {
    const withSongs = nightcorePlaylists.filter(p => p.fields.anzahl_songs != null);
    if (!withSongs.length) return null;
    return Math.round(withSongs.reduce((s, p) => s + (p.fields.anzahl_songs ?? 0), 0) / withSongs.length);
  }, [nightcorePlaylists]);

  const getRecord = useCallback((id: string) =>
    nightcorePlaylists.find(p => p.record_id === id),
    [nightcorePlaylists]
  );

  // Bewertung ändern (Drag)
  const moveCard = useCallback(async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const rec = nightcorePlaylists.find(p => p.record_id === rid);
    if (!rec) return;
    const oldBewertung = rec.fields.bewertung;
    const newLabel = LOOKUP_OPTIONS['nightcore_playlists']?.['bewertung']?.find(o => o.key === newColumn)?.label ?? newColumn;
    // Optimistic update
    setNightcorePlaylists(prev =>
      prev.map(p =>
        p.record_id === rid
          ? { ...p, fields: { ...p.fields, bewertung: { key: newColumn, label: newLabel } } }
          : p
      )
    );
    undoToast(`Bewertung auf ${newLabel} gesetzt`, async () => {
      setNightcorePlaylists(prev =>
        prev.map(p =>
          p.record_id === rid
            ? { ...p, fields: { ...p.fields, bewertung: oldBewertung } }
            : p
        )
      );
      await LivingAppsService.updateNightcorePlaylist(rid, { bewertung: oldBewertung });
    });
    try {
      await LivingAppsService.updateNightcorePlaylist(rid, { bewertung: newColumn });
    } catch {
      fetchAll();
    }
  }, [nightcorePlaylists, setNightcorePlaylists, fetchAll]);

  // Favorit-Toggle
  const toggleFavorit = useCallback(async (rec: NightcorePlaylists) => {
    const newVal = !rec.fields.favorit;
    setNightcorePlaylists(prev =>
      prev.map(p =>
        p.record_id === rec.record_id ? { ...p, fields: { ...p.fields, favorit: newVal } } : p
      )
    );
    undoToast(newVal ? `${rec.fields.titel} als Favorit markiert` : `${rec.fields.titel} aus Favoriten entfernt`, async () => {
      setNightcorePlaylists(prev =>
        prev.map(p =>
          p.record_id === rec.record_id ? { ...p, fields: { ...p.fields, favorit: !newVal } } : p
        )
      );
      await LivingAppsService.updateNightcorePlaylist(rec.record_id, { favorit: !newVal });
    });
    try {
      await LivingAppsService.updateNightcorePlaylist(rec.record_id, { favorit: newVal });
    } catch {
      fetchAll();
    }
  }, [setNightcorePlaylists, fetchAll]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const rec = deleteTarget;
    setDeleteTarget(null);
    overlay.close();
    undoToast(`${rec.fields.titel} gelöscht`);
    await LivingAppsService.deleteNightcorePlaylist(rec.record_id);
    fetchAll();
  }, [deleteTarget, overlay, fetchAll]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Context-Zeile
  const contextLine = totalCount === 0
    ? 'Noch keine Playlists gespeichert — leg deine erste an!'
    : topPlaylists.length > 0
      ? `${gruss(clock)} ${namen(topPlaylists.map(p => p.fields.titel ?? ''))} ${topPlaylists.length === 1 ? 'ist deine Top-Playlist' : 'sind deine Top-Playlists'}.`
      : `${gruss(clock)} Du hast ${totalCount} Playlist${totalCount !== 1 ? 's' : ''} gesammelt.`;

  // Empty state
  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nightcore Playlist Manager</h1>
            <p className="text-muted-foreground mt-1">Richte deine Sammlung ein</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <IconHeadphones size={48} className="text-muted-foreground" stroke={1.5} />
          <h2 className="text-lg font-semibold">Noch keine Playlists</h2>
          <p className="text-muted-foreground max-w-xs">
            Sammle und bewerte deine Nightcore-Playlists aus YouTube, Spotify und mehr.
          </p>
          <Button onClick={() => { setEditingRecord(undefined); setCreateDefaults(undefined); setDialogOpen(true); }}>
            <IconPlus size={16} className="shrink-0" /> Erste Playlist hinzufügen
          </Button>
        </div>
        <NightcorePlaylistsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (fields) => { await LivingAppsService.createNightcorePlaylist(fields); fetchAll(); }}
          enablePhotoScan={AI_PHOTO_SCAN['NightcorePlaylists']}
          enablePhotoLocation={AI_PHOTO_LOCATION['NightcorePlaylists']}
        />
      </div>
    );
  }

  const currentItem = overlay.top;
  const currentRecord = currentItem ? getRecord(currentItem.id) : undefined;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">Nightcore Playlist Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">{contextLine}</p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => { setEditingRecord(undefined); setCreateDefaults(undefined); setDialogOpen(true); }}
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">Playlist hinzufügen</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title="Playlists gesamt"
              value={totalCount}
              icon={<IconHeadphones size={16} />}
            />
            <StatStripItem
              title="Favoriten"
              value={favCount}
              icon={<IconHeart size={16} />}
              tone={favCount > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title="Top-Rated"
              value={topPlaylists.length}
              icon={<IconStar size={16} />}
              tone={topPlaylists.length > 0 ? 'success' : 'default'}
            />
            {avgSongs != null && (
              <StatStripItem
                title="Ø Songs"
                value={avgSongs}
                icon={<IconHeadphones size={16} />}
              />
            )}
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={kanbanCards}
            columns={RATING_COLUMNS}
            onCardClick={card => {
              const rid = card.id.split(':')[1] ?? '';
              overlay.replace({ type: 'playlist', id: rid });
            }}
            onCardMove={moveCard}
            onAddCard={column => {
              setEditingRecord(undefined);
              setCreateDefaults({ bewertung: column });
              setDialogOpen(true);
            }}
          />
        }
        aside={
          <>
            <WorkList
              title="Favoriten"
              items={favoriten.map(p => ({
                id: p.record_id,
                title: p.fields.titel ?? 'Ohne Titel',
                secondLine: (
                  <span className="text-muted-foreground text-xs">
                    {[p.fields.plattform?.label, displayMultiLookup(p.fields.genre_tags)].filter(s => s && s !== '—').join(' · ')}
                  </span>
                ),
                action: {
                  label: '♥ Entfernen',
                  onClick: () => toggleFavorit(p),
                },
              }))}
              onItemClick={id => overlay.replace({ type: 'playlist', id })}
              empty={{ text: 'Noch keine Favoriten — markiere deine liebsten Playlists' }}
            />
            <ChartWidget
              title="Genre-Verteilung"
              rows={chartRows}
              dimension={{
                kind: 'category',
                accessor: (row) => row.data.fields.genre_tags,
                label: 'Genre',
              }}
            />
          </>
        }
      />

      {/* Dialogs */}
      <NightcorePlaylistsDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRecord(undefined); setCreateDefaults(undefined); }}
        onSubmit={async (fields) => {
          if (editingRecord) {
            await LivingAppsService.updateNightcorePlaylist(editingRecord.record_id, fields);
          } else {
            await LivingAppsService.createNightcorePlaylist(fields);
          }
          fetchAll();
        }}
        defaultValues={editingRecord ? editingRecord.fields : createDefaults}
        recordId={editingRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['NightcorePlaylists']}
        enablePhotoLocation={AI_PHOTO_LOCATION['NightcorePlaylists']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Playlist löschen"
        description={`„${deleteTarget?.fields.titel}" wirklich aus deiner Sammlung entfernen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Overlay stack */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type !== 'playlist') return null;
          const rec = getRecord(top.id);
          if (!rec) return null;
          return (
            <>
              <RecordHeader
                title={rec.fields.titel ?? 'Ohne Titel'}
                subtitle={[rec.fields.bewertung?.label, rec.fields.plattform?.label].filter(Boolean).join(' · ')}
                badges={
                  rec.fields.favorit ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <IconHeart size={12} className="shrink-0" /> Favorit
                    </span>
                  ) : undefined
                }
                actions={
                  <div className="flex gap-2 flex-wrap">
                    {rec.fields.playlist_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(rec.fields.playlist_url, '_blank', 'noopener')}
                      >
                        <IconExternalLink size={14} className="shrink-0" />
                        <span>Öffnen</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingRecord(rec); setDialogOpen(true); }}
                    >
                      <IconEdit size={14} className="shrink-0" />
                      <span>Bearbeiten</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(rec)}
                    >
                      <IconTrash size={14} className="shrink-0 text-destructive" />
                    </Button>
                  </div>
                }
              />
              <NightcorePlaylistsDetails record={rec} />
            </>
          );
        }}
        footer={top => {
          const rec = getRecord(top.id);
          if (!rec) return undefined;
          return {
            label: rec.fields.favorit ? '♥ Aus Favoriten entfernen' : '♥ Als Favorit markieren',
            onClick: () => { toggleFavorit(rec); overlay.close(); },
          };
        }}
      />
    </div>
  );
}
