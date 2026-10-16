import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError, createSelection, listSkus, Sku } from "../api";
import { theme } from "../theme";

const MAX_SELECTED = 2;

type Props = { onLogout: () => void };
type Notice = { kind: "success" | "error"; text: string };

export default function ItemsScreen({ onLogout }: Props) {
  const [skus, setSkus] = useState<Sku[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const isFull = selected.length >= MAX_SELECTED;
  const canConfirm = selected.length > 0 && !confirming;

  function fail(e: unknown): boolean {
    const err = e as ApiError;
    if (err.status === 401) {
      onLogout();
      return true;
    }
    setNotice({ kind: "error", text: err.message });
    return false;
  }

  async function load() {
    try {
      const next = await listSkus();
      setSkus(next);
      setSelected((ids) => ids.filter((id) => next.some((sku) => sku.id === id)));
    } catch (e) {
      fail(e);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function toggle(id: number) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      setNotice(null);
    } else if (!isFull) {
      setSelected([...selected, id]);
      setNotice(null);
    } else {
      setNotice({ kind: "error", text: `You can pick up to ${MAX_SELECTED} items. Tap one to unselect it.` });
    }
  }

  async function confirm() {
    if (!canConfirm) return;
    setConfirming(true);
    setNotice(null);
    const titles = skus.filter((sku) => selected.includes(sku.id)).map((sku) => sku.title);
    try {
      await createSelection(selected);
      setSelected([]);
      setNotice({ kind: "success", text: `Confirmed: ${titles.join(", ")}` });
    } catch (e) {
      if (fail(e)) return;
    }
    await load();
    setConfirming(false);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Items</Text>
            <Text style={styles.subtitle}>
              Pick up to {MAX_SELECTED} · {selected.length}/{MAX_SELECTED} selected
            </Text>
          </View>
          <Pressable onPress={onLogout} hitSlop={8} accessibilityRole="button">
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>

        {notice && (
          <Text style={[styles.notice, notice.kind === "error" && styles.noticeError]}>{notice.text}</Text>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={skus}
            keyExtractor={(sku) => String(sku.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />
            }
            ListEmptyComponent={<Text style={styles.empty}>Everything is sold out.</Text>}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              return (
                <SkuCard
                  sku={item}
                  selected={isSelected}
                  dimmed={isFull && !isSelected}
                  onPress={() => toggle(item.id)}
                />
              );
            }}
          />
        )}

        <Pressable
          style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
          onPress={confirm}
          disabled={!canConfirm}
          accessibilityRole="button"
        >
          {confirming ? (
            <ActivityIndicator color={theme.colors.backgroundDeep} />
          ) : (
            <Text style={styles.confirmText}>
              {selected.length > 0 ? `Confirm (${selected.length})` : "Confirm"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type CardProps = { sku: Sku; selected: boolean; dimmed: boolean; onPress: () => void };

function SkuCard({ sku, selected, dimmed, onPress }: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected, dimmed && styles.cardDimmed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sku.title}
    >
      {sku.thumbnail ? (
        <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.image} />
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {sku.title}
      </Text>
      <Text style={styles.cardMeta}>
        ${sku.price.toFixed(2)} · {sku.quantity} left
      </Text>
      {selected && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600" },
  subtitle: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  signOut: { color: theme.colors.muted, fontSize: 14, paddingTop: theme.spacing.sm },
  notice: {
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundDeep,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    borderRadius: theme.spacing.xs,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  noticeError: { borderLeftColor: theme.colors.muted },
  loader: { marginTop: theme.spacing.lg },
  list: { paddingBottom: theme.spacing.md, gap: theme.spacing.md },
  row: { justifyContent: "space-between" },
  empty: { color: theme.colors.muted, textAlign: "center", marginTop: theme.spacing.lg },
  card: {
    width: "48.5%",
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radius,
    borderWidth: 2,
    borderColor: "transparent",
    padding: theme.spacing.sm,
  },
  cardSelected: { borderColor: theme.colors.accent },
  cardDimmed: { opacity: 0.45 },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.radius - 4,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "500" },
  cardMeta: { color: theme.colors.muted, fontSize: 12, marginTop: theme.spacing.xs },
  badge: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: theme.colors.backgroundDeep, fontWeight: "700" },
  confirm: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "600" },
});
