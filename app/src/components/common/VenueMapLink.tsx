import { OshiIcon } from "./OshiIcon";

export default function VenueMapLink({ venue }: { venue: string }) {
  if (!venue.trim()) return null;
  return <a
    className="venue-map-link"
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.trim())}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${venue.trim()}をGoogleマップで開く（外部）`}
  >
    <OshiIcon name="place" size={20} alt="" />
    <span>Googleマップで開く</span>
    <OshiIcon name="external-link" size={16} alt="" />
  </a>;
}
