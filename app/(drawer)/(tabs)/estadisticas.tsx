import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { db } from "../../../config/firebase";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";
import { Publicacion, Usuario } from "../../../models/firebaseModels";

const SCREEN_W = Dimensions.get("window").width;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function ScatterPlot({
  data,
  width,
  height,
  colors,
}: {
  data: { x: number; y: number }[];
  width: number;
  height: number;
  colors: ThemeColors;
}) {
  const PAD = { top: 10, right: 10, bottom: 28, left: 32 };
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const maxX = Math.max(...data.map((d) => d.x), 5);
  const maxY = Math.max(...data.map((d) => d.y), 10);

  const sx = (x: number) => PAD.left + (x / maxX) * plotW;
  const sy = (y: number) => PAD.top + plotH - (y / maxY) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * maxY));
  const xTicks = [0, Math.round(maxX / 2), maxX];

  return (
    <Svg width={width} height={height}>
      {yTicks.map((tick, i) => (
        <Line
          key={`gy${i}`}
          x1={PAD.left} y1={sy(tick)}
          x2={PAD.left + plotW} y2={sy(tick)}
          stroke={colors.border} strokeWidth={1}
        />
      ))}
      {yTicks.map((tick, i) => (
        <SvgText
          key={`ty${i}`}
          x={PAD.left - 4} y={sy(tick) + 4}
          fontSize="9" fill={colors.textSecondary} textAnchor="end"
        >
          {String(tick)}
        </SvgText>
      ))}
      {xTicks.map((tick, i) => (
        <SvgText
          key={`tx${i}`}
          x={sx(tick)} y={PAD.top + plotH + 16}
          fontSize="9" fill={colors.textSecondary} textAnchor="middle"
        >
          {String(tick)}
        </SvgText>
      ))}
      <Line
        x1={PAD.left} y1={PAD.top}
        x2={PAD.left} y2={PAD.top + plotH}
        stroke={colors.border} strokeWidth={1}
      />
      <Line
        x1={PAD.left} y1={PAD.top + plotH}
        x2={PAD.left + plotW} y2={PAD.top + plotH}
        stroke={colors.border} strokeWidth={1}
      />
      {data.map((d, i) => (
        <Circle
          key={`pt${i}`}
          cx={sx(d.x)} cy={sy(d.y)}
          r={5} fill={colors.accent} opacity={0.8}
        />
      ))}
    </Svg>
  );
}

export default function EstadisticasScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [publicaciones, setPublicaciones] = useState<{ id: string; data: Publicacion }[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; data: Usuario }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pubSnap, userSnap] = await Promise.all([
        get(ref(db, "publicaciones")),
        get(ref(db, "usuarios")),
      ]);
      const pubsArr: { id: string; data: Publicacion }[] = [];
      if (pubSnap.exists()) {
        pubSnap.forEach((child) => {
          pubsArr.push({ id: child.key!, data: child.val() as Publicacion });
        });
      }
      setPublicaciones(pubsArr);
      const usersArr: { id: string; data: Usuario }[] = [];
      if (userSnap.exists()) {
        userSnap.forEach((child) => {
          usersArr.push({ id: child.key!, data: child.val() as Usuario });
        });
      }
      setUsuarios(usersArr);
    } catch (e) {
      console.error("Error cargando estadísticas:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const barTipoData = useMemo(() => {
    const conteo: Record<string, number> = { reporte: 0, perdidos: 0, recreacion: 0 };
    publicaciones.forEach(({ data: p }) => {
      if (conteo[p.tipo] !== undefined) conteo[p.tipo]++;
    });
    return [
      { value: conteo.reporte, label: "Reporte", frontColor: "#EF4444" },
      { value: conteo.perdidos, label: "Perdidos", frontColor: "#F59E0B" },
      { value: conteo.recreacion, label: "Recr.", frontColor: "#10B981" },
    ];
  }, [publicaciones]);

  const areaUsuariosData = useMemo(() => {
    const ahora = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = ahora.getMonth() - (11 - i);
      const endOfMonth = new Date(ahora.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      const count = usuarios.filter(({ data: u }) =>
        u.fechaRegistro && new Date(u.fechaRegistro) <= endOfMonth
      ).length;
      return { value: count, label: MESES[endOfMonth.getMonth()] };
    });
  }, [usuarios]);

  const scatterData = useMemo(() =>
    publicaciones
      .filter(({ data: p }) =>
        p.tipo === "perdidos" && p.estado === "resuelto" && !!p.fechaResolucion
      )
      .map(({ data: p }) => ({
        x: p.fotos ? Object.keys(p.fotos).length : 0,
        y: Math.max(0, Math.round(
          (new Date(p.fechaResolucion!).getTime() - new Date(p.fechaRegistro).getTime()) /
          (1000 * 60 * 60 * 24)
        )),
      })),
    [publicaciones]
  );

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const chartW = SCREEN_W - 64;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Estadísticas Globales</Text>

      {/* Bar Chart — publicaciones por tipo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Publicaciones por tipo</Text>
        <Text style={styles.cardSub}>{publicaciones.length} publicaciones en la plataforma</Text>
        {publicaciones.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Sin publicaciones todavía.</Text>
          </View>
        ) : (
          <BarChart
            data={barTipoData}
            width={chartW}
            height={180}
            noOfSections={4}
            barBorderRadius={6}
            barWidth={60}
            spacing={22}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            rulesColor={colors.border}
            isAnimated
          />
        )}
      </View>

      {/* Area Chart — crecimiento acumulado de usuarios */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crecimiento de usuarios</Text>
        <Text style={styles.cardSub}>{usuarios.length} usuarios registrados en total</Text>
        {usuarios.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Sin usuarios registrados.</Text>
          </View>
        ) : (
          <LineChart
            data={areaUsuariosData}
            width={chartW}
            height={160}
            color="#6366F1"
            thickness={2.5}
            dataPointsColor="#6366F1"
            startFillColor="#6366F1"
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
        )}
      </View>

      {/* Scatter Chart — fotos vs. días hasta resolución */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evidencia visual vs. resolución</Text>
        <Text style={styles.cardSub}>
          Mascotas perdidas resueltas · Eje X: fotos · Eje Y: días hasta encontrarla
        </Text>
        {scatterData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="analytics-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Sin mascotas perdidas resueltas todavía.</Text>
            <Text style={styles.emptyHint}>
              Usa &quot;Marcar como encontrado&quot; en una publicación de tipo Perdidos.
            </Text>
          </View>
        ) : (
          <ScatterPlot data={scatterData} width={chartW} height={200} colors={colors} />
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 30 },
    centrado: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    pageTitle: { fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 16 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 14,
      alignSelf: "flex-start",
    },
    emptyChart: {
      height: 120,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      gap: 8,
    },
    emptyText: { color: colors.textSecondary, fontSize: 14 },
    emptyHint: { color: colors.textSecondary, fontSize: 12, textAlign: "center", paddingHorizontal: 16 },
  });
