import { StyleSheet, View } from "react-native";
import { border } from "@/lib/theme/tokens";

export function HairlineDivider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.hairline,
  },
});
