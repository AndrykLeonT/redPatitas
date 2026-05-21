import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { get, ref, remove } from "firebase/database";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import OfflineBanner from "../../components/OfflineBanner";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { guardarAdopcionLocal, listarAdopcionesPorUsuario } from "../../database/adopcionesLocal";
import { recalcularYGuardarEstadisticas } from "../../database/estadisticasLocal";
import { listarMascotasPorUsuario, MascotaConMeta } from "../../database/mascotasLocal";
import { listarPublicacionesPorUsuario, PublicacionConMeta } from "../../database/publicacionesLocal";
import { guardarUsuarioLocal, obtenerUsuarioLocal } from "../../database/usuariosLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Adopcion, Mascota, Publicacion, Usuario } from "../../models/firebaseModels";
import { cacheMascotaDesdeFirebase, cachePublicacionDesdeFirebase } from "../../services/syncService";
import { AVATARES } from "../../utils/avatars";
import { formatearEdad } from "../../utils/dateUtils";
import { obtenerTituloPublicacion } from "../../utils/publicacionText";

type MascotaItem = { id: string; data: Mascota };
type PubItem = { id: string; data: Publicacion };

const SCREEN_W = Dimensions.get("window").width;

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreacion",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

const PIE_COLORS = ["#FF8C42", "#4F6D7A", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const PREVIEW = 3;

function resolverAvatar(fotoPerfil: string | null) {
  if (!fotoPerfil) return (AVATARES as any)["default"];
  return (AVATARES as any)[fotoPerfil] ?? (AVATARES as any)["default"];
}

// Convierte la fila local (con metadatos de sync) al shape que usa la pantalla.
function mascotaConMetaToItem(m: MascotaConMeta): MascotaItem {
  const { id, pendienteSync, creadoLocal, eliminadoLocal, ...data } = m;
  return { id, data: data as Mascota };
}

function publicacionConMetaToItem(p: PublicacionConMeta): PubItem {
  const { id, pendienteSync, creadoLocal, eliminadoLocal, ...data } = p;
  return { id, data: data as Publicacion };
}

// Perfil del usuario: combina datos personales, graficas y resumen offline/online.
export default function PerfilScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mascotas, setMascotas] = useState<MascotaItem[]>([]);
  const [publicaciones, setPublicaciones] = useState<PubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "ano">("semana");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adopciones, setAdopciones] = useState<{ id: string; data: Adopcion }[]>([]);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userId, role] = await Promise.all([
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userRole"),
      ]);
      if (!userId) {
        setIsLoading(false);
        return;
      }
      setUserRole(role);

      const cargarDesdeLocal = () => {
        // En modo offline, el perfil se arma solo con tablas locales del usuario activo.
        const userLocal = obtenerUsuarioLocal(userId);
        if (userLocal) setUsuario(userLocal);

        setMascotas(listarMascotasPorUsuario(userId).map(mascotaConMetaToItem));

        const pubsLocal = listarPublicacionesPorUsuario(userId)
          .map(publicacionConMetaToItem)
          .sort((a, b) =>
            new Date(b.data.fechaRegistro).getTime() - new Date(a.data.fechaRegistro).getTime()
          );
        setPublicaciones(pubsLocal);

        const adoptLocal = listarAdopcionesPorUsuario(userId).map((a) => ({
          id: a.id,
          data: {
            idMascota: a.idMascota, idUsuario: a.idUsuario, tipoAnimal: a.tipoAnimal,
            nombreMascota: a.nombreMascota, via: a.via, fechaAdopcion: a.fechaAdopcion,
          } as Adopcion,
        }));
        setAdopciones(adoptLocal);
      };

      // Sin conexion: solo SQLite
      if (isConnected === false) {
        cargarDesdeLocal();
        return;
      }

      // Con conexion (o aun sin determinar): Firebase primero, fallback a SQLite si falla
      try {
        const [userSnap, mascSnap, pubSnap, adoptSnap] = await Promise.all([
          get(ref(db, `usuarios/${userId}`)),
          get(ref(db, "mascotas")),
          get(ref(db, "publicaciones")),
          get(ref(db, "adopciones")),
        ]);

        if (userSnap.exists()) {
          const u = userSnap.val() as Usuario;
          setUsuario(u);
          guardarUsuarioLocal(userId, u);
        }

        const mascotasArr: MascotaItem[] = [];
        if (mascSnap.exists()) {
          mascSnap.forEach((child) => {
            const m = child.val() as Mascota;
            if (m.idUsuario === userId) {
              mascotasArr.push({ id: child.key!, data: m });
              cacheMascotaDesdeFirebase(child.key!, m);
            }
          });
        }
        setMascotas(mascotasArr);

        const pubsArr: PubItem[] = [];
        if (pubSnap.exists()) {
          pubSnap.forEach((child) => {
            const p = child.val() as Publicacion;
            if (p.idUsuario === userId) {
              pubsArr.push({ id: child.key!, data: p });
              cachePublicacionDesdeFirebase(child.key!, p);
            }
          });
        }
        pubsArr.sort((a, b) =>
          new Date(b.data.fechaRegistro).getTime() - new Date(a.data.fechaRegistro).getTime()
        );
        setPublicaciones(pubsArr);

        const adoptArr: { id: string; data: Adopcion }[] = [];
        if (adoptSnap.exists()) {
          adoptSnap.forEach((child) => {
            const a = child.val() as Adopcion;
            if (a.idUsuario === userId) {
              adoptArr.push({ id: child.key!, data: a });
              guardarAdopcionLocal(child.key!, a);
            }
          });
        }
        setAdopciones(adoptArr);

        // Recalcular estadisticas con el snapshot fresco
        recalcularYGuardarEstadisticas(userId);
      } catch (firebaseErr) {
        console.warn("Firebase fallo al cargar perfil, fallback a SQLite", firebaseErr);
        cargarDesdeLocal();
      }
    } catch (e) {
      console.error("Error cargando perfil:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const pieData = useMemo(() => {
    if (mascotas.length === 0) return [];
    const conteo: Record<string, number> = {};
    mascotas.forEach((m) => {
      const tipo = m.data.tipoAnimal || "Otro";
      conteo[tipo] = (conteo[tipo] ?? 0) + 1;
    });
    return Object.entries(conteo).map(([tipo, count], i) => ({
      value: count,
      color: PIE_COLORS[i % PIE_COLORS.length],
      label: tipo,
      text: `${Math.round((count / mascotas.length) * 100)}%`,
    }));
  }, [mascotas]);

  const lineData = useMemo(() => {
    const ahora = new Date();
    if (periodo === "semana") {
      return Array.from({ length: 7 }, (_, i) => {
        const fecha = new Date(ahora);
        fecha.setDate(ahora.getDate() - (6 - i));
        const count = publicaciones.filter((p) => {
          const d = new Date(p.data.fechaRegistro);
          return d.toDateString() === fecha.toDateString();
        }).length;
        return { value: count, label: DIAS[fecha.getDay()] };
      });
    }
    if (periodo === "mes") {
      return Array.from({ length: 4 }, (_, i) => {
        const finSem = new Date(ahora);
        finSem.setDate(ahora.getDate() - (3 - i) * 7);
        const inicioSem = new Date(finSem);
        inicioSem.setDate(finSem.getDate() - 7);
        const count = publicaciones.filter((p) => {
          const d = new Date(p.data.fechaRegistro);
          return d >= inicioSem && d < finSem;
        }).length;
        return { value: count, label: `Sem ${i + 1}` };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const target = new Date(ahora.getFullYear(), ahora.getMonth() - (11 - i), 1);
      const count = publicaciones.filter((p) => {
        const d = new Date(p.data.fechaRegistro);
        return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
      }).length;
      return { value: count, label: MESES[target.getMonth()] };
    });
  }, [publicaciones, periodo]);

  const barAdopcionesMes = useMemo(() => {
    if (adopciones.length === 0) return [];
    const ahora = new Date();
    const data: { value: number; label: string; frontColor: string; spacing: number; barWidth: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const target = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const perros = adopciones.filter(({ data: a }) => {
        const d = new Date(a.fechaAdopcion);
        return d.getFullYear() === target.getFullYear() &&
               d.getMonth() === target.getMonth() &&
               a.tipoAnimal.toLowerCase().includes("perro");
      }).length;
      const gatos = adopciones.filter(({ data: a }) => {
        const d = new Date(a.fechaAdopcion);
        return d.getFullYear() === target.getFullYear() &&
               d.getMonth() === target.getMonth() &&
               a.tipoAnimal.toLowerCase().includes("gato");
      }).length;
      data.push(
        { value: perros, label: MESES[target.getMonth()], frontColor: "#FF8C42", spacing: 2, barWidth: 14 },
        { value: gatos, label: "", frontColor: "#4F6D7A", spacing: 18, barWidth: 14 },
      );
    }
    return data;
  }, [adopciones]);

  const barAdopcionesVia = useMemo(() => {
    const porApp = adopciones.filter(({ data: a }) => a.via === "app").length;
    const externas = adopciones.filter(({ data: a }) => a.via === "externo").length;
    return [
      { value: porApp, label: "Por App", frontColor: "#FF8C42" },
      { value: externas, label: "Externas", frontColor: "#4F6D7A" },
    ];
  }, [adopciones]);

  const eliminarCuenta = () => {
    if (isConnected === false) {
      Alert.alert(
        "Sin conexion",
        "Eliminar tu cuenta requiere conexion a internet.",
      );
      return;
    }
    Alert.alert(
      "Eliminar cuenta",
      "Se eliminaran tu perfil, todas tus mascotas y publicaciones. Esta accion no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem("userId");
              if (!userId) return;

              const [mascSnap, pubSnap] = await Promise.all([
                get(ref(db, "mascotas")),
                get(ref(db, "publicaciones")),
              ]);

              const deletes: Promise<void>[] = [];
              if (mascSnap.exists()) {
                mascSnap.forEach((child) => {
                  if ((child.val() as Mascota).idUsuario === userId)
                    deletes.push(remove(ref(db, `mascotas/${child.key}`)));
                });
              }
              if (pubSnap.exists()) {
                pubSnap.forEach((child) => {
                  if ((child.val() as Publicacion).idUsuario === userId)
                    deletes.push(remove(ref(db, `publicaciones/${child.key}`)));
                });
              }
              deletes.push(remove(ref(db, `usuarios/${userId}`)));
              await Promise.all(deletes);

              await AsyncStorage.clear();
              router.replace("/");
            } catch {
              Alert.alert("Error", "No se pudo eliminar la cuenta.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const mascotasPreview = mascotas.slice(0, PREVIEW);
  const pubsPreview = publicaciones.slice(0, PREVIEW);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      {isConnected === false && <OfflineBanner />}

      {/* Header */}
      <View style={styles.headerCard}>
        <Pressable style={styles.btnEditarPerfil} onPress={() => router.push("/registro?edit=1" as any)}>
          <Ionicons name="create-outline" size={18} color={colors.accent} />
          <Text style={styles.btnEditarPerfilText}>Editar</Text>
        </Pressable>
        <Image source={resolverAvatar(usuario?.fotoPerfil ?? null)} style={styles.avatar} />
        <Text style={styles.nombre}>{usuario?.nombreCompleto ?? "Usuario"}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{usuario?.rol ?? ""}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{mascotas.length}</Text>
            <Text style={styles.statLabel}>Mascotas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{publicaciones.length}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{usuario?.correo ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{usuario?.celular ?? "-"}</Text>
        </View>
        {usuario?.fechaRegistro ? (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Miembro desde{" "}
              {new Date(usuario.fechaRegistro).toLocaleDateString("es-MX", {
                year: "numeric", month: "long",
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Mis Mascotas */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Mascotas ({mascotas.length})</Text>
        <View style={styles.sectionActions}>
          {mascotas.length > 0 && (
            <Pressable style={styles.btnSmall} onPress={() => router.push("/(drawer)/misMascotas" as any)}>
              <Text style={styles.btnSmallText}>Ver todo</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btnSmall, styles.btnSmallPrimary]} onPress={() => router.push("/mascota/nueva" as any)}>
            <Ionicons name="add" size={14} color={colors.textInverse} />
            <Text style={[styles.btnSmallText, { color: colors.textInverse }]}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      {mascotas.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="paw-outline" size={36} color={colors.textSecondary} />
          <Text style={styles.emptySectionText}>No tienes mascotas registradas.</Text>
        </View>
      ) : (
        <>
          {mascotasPreview.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemCard}
              onPress={() => router.push(`/mascota/${item.id}` as any)}
            >
              <View style={styles.itemIconBox}>
                <Ionicons name="paw" size={28} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.data.nombre}</Text>
                <Text style={styles.itemSub}>
                  {item.data.tipoAnimal} - {item.data.raza} -{" "}
                  {formatearEdad(item.data.fechaNacimiento)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
          {mascotas.length > PREVIEW && (
            <Pressable style={styles.verMasBtn} onPress={() => router.push("/(drawer)/misMascotas" as any)}>
              <Text style={styles.verMasBtnText}>Ver {mascotas.length - PREVIEW} mas â†’</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Mis Publicaciones */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Mis Publicaciones ({publicaciones.length})</Text>
        <View style={styles.sectionActions}>
          {publicaciones.length > 0 && (
            <Pressable style={styles.btnSmall} onPress={() => router.push("/(drawer)/misPublicaciones" as any)}>
              <Text style={styles.btnSmallText}>Ver todo</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btnSmall, styles.btnSmallPrimary]} onPress={() => router.push("/publicacion/nueva" as any)}>
            <Ionicons name="add" size={14} color={colors.textInverse} />
            <Text style={[styles.btnSmallText, { color: colors.textInverse }]}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      {publicaciones.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="newspaper-outline" size={36} color={colors.textSecondary} />
          <Text style={styles.emptySectionText}>No tienes publicaciones.</Text>
        </View>
      ) : (
        <>
          {pubsPreview.map((item) => {
            const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
            return (
              <Pressable
                key={item.id}
                style={styles.pubCard}
                onPress={() => router.push(`/publicacion/${item.id}` as any)}
              >
                {primeraFoto ? (
                  <Image source={{ uri: primeraFoto }} style={styles.pubFoto} />
                ) : (
                  <View style={[styles.pubFoto, styles.pubFotoPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <View style={[styles.tagSmall, { backgroundColor: TIPO_COLOR[item.data.tipo] ?? "#6B7280" }]}>
                    <Text style={styles.tagSmallText}>{TIPO_LABEL[item.data.tipo] ?? item.data.tipo}</Text>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {obtenerTituloPublicacion(item.data)}
                  </Text>
                  <Text style={styles.itemSub}>
                    {new Date(item.data.fechaRegistro).toLocaleDateString("es-MX")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
          {publicaciones.length > PREVIEW && (
            <Pressable style={styles.verMasBtn} onPress={() => router.push("/(drawer)/misPublicaciones" as any)}>
              <Text style={styles.verMasBtnText}>Ver {publicaciones.length - PREVIEW} mas â†’</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Estadisticas */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Estadisticas</Text>
      </View>

      {/* Pie Chart â€” distribucion de mascotas */}
      {mascotas.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribucion de mascotas</Text>
          <PieChart
            data={pieData}
            donut
            showText
            textColor="#FFF"
            radius={90}
            innerRadius={54}
            innerCircleColor={colors.surface}
            textSize={12}
            focusOnPress
            centerLabelComponent={() => (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.text }}>
                  {mascotas.length}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>mascotas</Text>
              </View>
            )}
          />
          <View style={styles.pieLeyenda}>
            {pieData.map((item, i) => (
              <View key={i} style={styles.pieLeyendaItem}>
                <View style={[styles.pieLeyendaDot, { backgroundColor: item.color }]} />
                <Text style={styles.pieLeyendaText}>
                  {item.label} ({item.value})
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="pie-chart-outline" size={36} color={colors.textSecondary} />
          <Text style={styles.emptySectionText}>Registra mascotas para ver estadisticas.</Text>
        </View>
      )}

      {/* Line Chart â€” actividad de publicaciones */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Actividad de publicaciones</Text>
        <View style={styles.periodoRow}>
          {(["semana", "mes", "ano"] as const).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodoChip, periodo === p && styles.periodoChipActivo]}
              onPress={() => setPeriodo(p)}
            >
              <Text style={[styles.periodoChipText, periodo === p && { color: colors.textInverse }]}>
                {p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Ano"}
              </Text>
            </Pressable>
          ))}
        </View>
        {publicaciones.length > 0 ? (
          <LineChart
            data={lineData}
            width={SCREEN_W - 96}
            height={160}
            color={colors.accent}
            thickness={2.5}
            dataPointsColor={colors.accent}
            startFillColor={colors.accent}
            endFillColor={colors.surface}
            startOpacity={0.35}
            endOpacity={0.02}
            areaChart
            noOfSections={4}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            rulesColor={colors.border}
            curved
            isAnimated
            hideDataPoints={false}
          />
        ) : (
          <View style={styles.chartEmpty}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptySectionText}>Sin publicaciones para mostrar.</Text>
          </View>
        )}
      </View>

      {/* Panel de Adopciones â€” solo Refugio */}
      {userRole === "Refugio" && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Panel de Adopciones</Text>
          </View>

          {adopciones.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="stats-chart-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.emptySectionText}>Aun no hay adopciones registradas.</Text>
            </View>
          ) : (
            <>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Perros vs. Gatos adoptados (ultimos 6 meses)</Text>
                <View style={[styles.pieLeyenda, { marginBottom: 14 }]}>
                  <View style={styles.pieLeyendaItem}>
                    <View style={[styles.pieLeyendaDot, { backgroundColor: "#FF8C42" }]} />
                    <Text style={styles.pieLeyendaText}>Perros</Text>
                  </View>
                  <View style={styles.pieLeyendaItem}>
                    <View style={[styles.pieLeyendaDot, { backgroundColor: "#4F6D7A" }]} />
                    <Text style={styles.pieLeyendaText}>Gatos</Text>
                  </View>
                </View>
                <BarChart
                  data={barAdopcionesMes}
                  width={SCREEN_W - 96}
                  height={160}
                  noOfSections={4}
                  barBorderRadius={4}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  rulesColor={colors.border}
                  isAnimated
                />
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Adopciones: App vs. Externas</Text>
                <BarChart
                  data={barAdopcionesVia}
                  width={SCREEN_W - 96}
                  height={160}
                  noOfSections={4}
                  barBorderRadius={4}
                  barWidth={60}
                  spacing={40}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                  rulesColor={colors.border}
                  isAnimated
                />
              </View>
            </>
          )}
        </>
      )}

      {/* Zona peligrosa */}
      <View style={styles.zonaEliminar}>
        <Text style={styles.zonaEliminarTitle}>Zona de peligro</Text>
        <Pressable style={styles.btnEliminarCuenta} onPress={eliminarCuenta}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.btnEliminarCuentaText}>Eliminar mi cuenta</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 30 },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    headerCard: {
      backgroundColor: colors.surface,
      alignItems: "center",
      padding: 24,
      marginBottom: 8,
      elevation: 2,
    },
    btnEditarPerfil: {
      position: "absolute",
      top: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      zIndex: 1,
    },
    btnEditarPerfilText: { color: colors.accent, fontWeight: "bold", fontSize: 13 },
    avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
    nombre: { fontSize: 22, fontWeight: "bold", color: colors.text },
    rolBadge: {
      backgroundColor: colors.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 4,
      marginTop: 6,
      marginBottom: 16,
    },
    rolText: { color: colors.accent, fontWeight: "bold", fontSize: 13 },
    statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    stat: { alignItems: "center", paddingHorizontal: 24 },
    statNum: { fontSize: 24, fontWeight: "bold", color: colors.accent },
    statLabel: { fontSize: 12, color: colors.textSecondary },
    statDivider: { width: 1, height: 36, backgroundColor: colors.border },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    infoText: { fontSize: 14, color: colors.textSecondary },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.background,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
    sectionActions: { flexDirection: "row", gap: 6 },
    btnSmall: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    btnSmallPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
    btnSmallText: { fontSize: 12, fontWeight: "bold", color: colors.accent },
    verMasBtn: { marginHorizontal: 16, marginBottom: 10, alignItems: "center", paddingVertical: 10 },
    verMasBtnText: { color: colors.accent, fontWeight: "bold", fontSize: 14 },
    emptySection: {
      alignItems: "center",
      paddingVertical: 24,
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 1,
    },
    emptySectionText: { color: colors.textSecondary, marginTop: 8, fontSize: 14 },
    itemCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      padding: 14,
      elevation: 2,
    },
    itemIconBox: {
      width: 48, height: 48,
      borderRadius: 24,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
    itemSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    pubCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      overflow: "hidden",
      elevation: 2,
    },
    pubFoto: { width: 80, height: 80 },
    pubFotoPlaceholder: { backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
    tagSmall: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: "flex-start",
      marginBottom: 4,
    },
    tagSmallText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
    chartCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 14,
      padding: 16,
      elevation: 2,
      alignItems: "center",
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 14,
      alignSelf: "flex-start",
    },
    pieLeyenda: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
      justifyContent: "center",
    },
    pieLeyendaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    pieLeyendaDot: { width: 10, height: 10, borderRadius: 5 },
    pieLeyendaText: { fontSize: 12, color: colors.textSecondary },
    periodoRow: { flexDirection: "row", gap: 8, marginBottom: 14, alignSelf: "flex-start" },
    periodoChip: {
      paddingVertical: 5,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    periodoChipActivo: { backgroundColor: colors.accent },
    periodoChipText: { fontSize: 12, fontWeight: "bold", color: colors.accent },
    chartEmpty: { alignItems: "center", paddingVertical: 20 },
    zonaEliminar: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.danger,
      elevation: 1,
    },
    zonaEliminarTitle: { fontSize: 13, fontWeight: "bold", color: colors.textSecondary, marginBottom: 10 },
    btnEliminarCuenta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.danger,
    },
    btnEliminarCuentaText: { color: colors.danger, fontWeight: "bold", fontSize: 15 },
  });
