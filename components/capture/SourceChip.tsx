import { Chip } from "@/components/ui/Chip";
import { CaptureSource } from "@/lib/ai/captureResultSchema";

const SOURCE_LABELS: Record<CaptureSource, string> = {
  spond: "Spond",
  vigilo: "Vigilo",
  mykid: "MyKid",
  kidplan: "Kidplan",
  skole: "Skole",
  vipps: "Vipps",
  annet: "Annet",
};

interface SourceChipProps {
  source: CaptureSource;
  selected: boolean;
  onPress: () => void;
}

export function SourceChip({ source, selected, onPress }: SourceChipProps) {
  return <Chip label={SOURCE_LABELS[source]} selected={selected} onPress={onPress} />;
}
