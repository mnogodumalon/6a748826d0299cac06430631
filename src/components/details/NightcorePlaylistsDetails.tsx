import type { NightcorePlaylists } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface NightcorePlaylistsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: NightcorePlaylists;
}

export function NightcorePlaylistsDetails({
  record,
}: NightcorePlaylistsDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Playlist-Titel" value={record.fields.titel} format="text" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Playlist-Link" value={record.fields.playlist_url} format="url" />
        <RecordField label="Cover-Bild" className="md:col-span-2">
          {record.fields.cover_bild ? (
            <MediaThumbnail src={record.fields.cover_bild as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label="Genre-Tags" value={Array.isArray(record.fields.genre_tags) ? record.fields.genre_tags.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label="Anzahl der Songs" value={record.fields.anzahl_songs} format="text" />
        <RecordField label="Erstellt am" value={record.fields.erstellt_am} format="date" />
        <RecordField label="Plattform" value={record.fields.plattform} format="pill" />
        <RecordField label="Bewertung" value={record.fields.bewertung} format="pill" />
        <RecordField label="Persönliche Notizen" value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label="Favorit" value={record.fields.favorit} format="bool" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.NIGHTCORE_PLAYLISTS} recordId={record.record_id} />
    </>
  );
}
