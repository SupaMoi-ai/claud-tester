import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useFamilyStore } from "@/lib/store/familyStore";
import { CaptureSource } from "@/lib/ai/captureResultSchema";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourceChip } from "@/components/capture/SourceChip";

const SOURCES: CaptureSource[] = ["spond", "vigilo", "mykid", "kidplan", "skole", "vipps", "annet"];

const PROCESSING_STEPS = [
  "Leser innhold",
  "Finner datoer og frister",
  "Lager reisesekk-liste",
  "Avgjør hvilket hjem",
  "Setter påminnelser",
];

const STEP_DURATION_MS = 550;

export default function Fang() {
  const router = useRouter();
  const { family, currentMember, initialize } = useFamilyStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [source, setSource] = useState<CaptureSource | null>(null);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!family) initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadCaptureImage(
    familyId: string,
    captureId: string,
    uri: string
  ): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const path = `${familyId}/${captureId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("captures")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (uploadError) throw uploadError;
    return path;
  }

  async function submit() {
    setError(null);

    if (!family || !currentMember) {
      setError("Familien er ikke lastet ennå.");
      return;
    }
    if (!text.trim() && !imageUri) {
      setError("Lim inn en tekst eller velg et skjermbilde først.");
      return;
    }

    const { data: capture, error: insertError } = await supabase
      .from("captures")
      .insert({
        family_id: family.id,
        created_by: currentMember.id,
        source,
        raw_text: text.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !capture) {
      setError(insertError?.message ?? "Kunne ikke opprette fangst.");
      return;
    }

    if (imageUri) {
      try {
        const imagePath = await uploadCaptureImage(family.id, capture.id, imageUri);
        const { error: imageUpdateError } = await supabase
          .from("captures")
          .update({ image_path: imagePath })
          .eq("id", capture.id);
        if (imageUpdateError) throw imageUpdateError;
      } catch (uploadErr) {
        setError(
          uploadErr instanceof Error
            ? `Kunne ikke laste opp skjermbildet: ${uploadErr.message}`
            : "Kunne ikke laste opp skjermbildet."
        );
        return;
      }
    }

    setProcessingStep(0);
    stepTimer.current = setInterval(() => {
      setProcessingStep((step) => (step === null ? null : (step + 1) % PROCESSING_STEPS.length));
    }, STEP_DURATION_MS);

    const { error: invokeError } = await supabase.functions.invoke("analyze-capture", {
      body: { capture_id: capture.id },
    });

    if (stepTimer.current) clearInterval(stepTimer.current);
    setProcessingStep(null);

    if (invokeError) {
      setError(
        `Kunne ikke analysere fangsten: ${invokeError.message}. Sjekk at analyze-capture er deployet og at Supabase-/Anthropic-nøklene er satt opp.`
      );
      return;
    }

    router.replace(`/fang/${capture.id}/gjennomgang`);
  }

  if (processingStep !== null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pine} style={{ marginBottom: spacing.lg }} />
        <Text style={textStyles.heading2}>{PROCESSING_STEPS[processingStep]}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={textStyles.heading1}>Fang opp noe</Text>
      <Text style={textStyles.body}>
        Ta et skjermbilde av en Spond-melding, en SMS fra skolen, eller lim inn teksten direkte.
      </Text>

      <Card>
        <Text style={textStyles.label}>Kilde</Text>
        <View style={styles.chips}>
          {SOURCES.map((s) => (
            <SourceChip key={s} source={s} selected={source === s} onPress={() => setSource(s)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={textStyles.label}>Skjermbilde</Text>
        <Pressable onPress={pickImage} style={styles.imagePicker}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Text style={textStyles.caption}>Trykk for å velge et bilde</Text>
          )}
        </Pressable>
      </Card>

      <Card>
        <Text style={textStyles.label}>Eller lim inn tekst</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="Lim inn meldingen her..."
          placeholderTextColor={colors.ink3}
          value={text}
          onChangeText={setText}
        />
      </Card>

      {error && <Text style={[textStyles.body, { color: colors.terra }]}>{error}</Text>}

      <Button label="Fang opp" onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  imagePicker: {
    marginTop: spacing.md,
    minHeight: 120,
    borderRadius: radii.inner,
    borderWidth: 1,
    borderColor: colors.ink3,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 160,
  },
  textInput: {
    marginTop: spacing.md,
    minHeight: 100,
    borderRadius: radii.inner,
    borderWidth: 1,
    borderColor: colors.ink3,
    padding: spacing.md,
    textAlignVertical: "top",
    ...textStyles.body,
  },
});
