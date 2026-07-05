import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Trip } from '../db/queries/trips';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a CSV string from an array of trips.
 */
export function generateCsv(trips: Trip[]): string {
  const headers = [
    'Date',
    'Start Address',
    'End Address',
    'Distance (km)',
    'Category',
    'Purpose',
    'Client',
    'Notes',
    'Rate ($/km)',
    'Deductible ($)',
    'Tracking Method',
  ];

  const rows = trips.map((trip) => [
    escapeCsvField(trip.date),
    escapeCsvField(trip.start_address ?? ''),
    escapeCsvField(trip.end_address ?? ''),
    trip.km.toFixed(2),
    escapeCsvField(trip.category),
    escapeCsvField(trip.purpose ?? ''),
    escapeCsvField(trip.client_name ?? ''),
    escapeCsvField(trip.notes ?? ''),
    trip.rate_used != null ? trip.rate_used.toFixed(4) : '',
    trip.deductible != null ? trip.deductible.toFixed(2) : '',
    trip.auto_tracked ? 'Auto' : 'Manual',
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Generate a CSV file from trips and share it via the system share dialog.
 */
export async function exportAndShareCsv(trips: Trip[]): Promise<void> {
  const csv = generateCsv(trips);
  const fileName = `mileage-export-${new Date().toISOString().split('T')[0]}.csv`;
  const filePath = Paths.cache.uri + '/' + fileName;

  const file = new File(filePath);
  file.text = csv;

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Mileage Data',
    UTI: 'public.comma-separated-values-text',
  });
}
