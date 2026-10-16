import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authenticate } from "../api";
import { theme } from "../theme";

type Props = { onLoggedIn: () => void };
type Mode = "login" | "register";

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const isLogin = mode === "login";
  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await authenticate(mode, email.trim(), password);
      onLoggedIn();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError(null);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.form}>
        <Text style={styles.title}>{isLogin ? "Welcome back" : "Create account"}</Text>
        <Text style={styles.subtitle}>{isLogin ? "Log in to pick your items." : "Sign up with your email."}</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!busy}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={isLogin ? "Your password" : "At least 8 characters"}
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isLogin ? "password" : "new-password"}
          textContentType={isLogin ? "password" : "newPassword"}
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.backgroundDeep} />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? "Log in" : "Create account"}</Text>
          )}
        </Pressable>

        <Pressable style={styles.switch} onPress={switchMode} disabled={busy} accessibilityRole="button">
          <Text style={styles.switchText}>
            {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, justifyContent: "center" },
  form: { width: "100%", maxWidth: 400, alignSelf: "center" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600" },
  subtitle: { color: theme.colors.muted, marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg },
  label: { color: theme.colors.muted, fontSize: 13, marginBottom: theme.spacing.xs },
  input: {
    backgroundColor: theme.colors.backgroundDeep,
    color: theme.colors.text,
    borderRadius: theme.radius,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  error: {
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundDeep,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    borderRadius: theme.spacing.xs,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "600" },
  switch: { marginTop: theme.spacing.md, alignItems: "center", padding: theme.spacing.sm },
  switchText: { color: theme.colors.accent },
});
