import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { get, push, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { Adopcion, Mascota } from "../../models/firebaseModels";

const { width, height } = Dimensions.get("window");

function Fila({
  label,
  valor,
  styles,
}: {
  label: string;
  valor: string | number | boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  const texto =
    typeof valor === "boolean" ? (valor ? "Sí" : "No") : String(valor ?? "-");
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{texto || "-"}</Text>
    </View>
  );
}

export default function MascotaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fotoViewer, setFotoViewer] = useState<{ fotos: string[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showBajaModal, setShowBajaModal] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("userId"),
      AsyncStorage.getItem("userRole"),
    ]).then(([uid, role]) => {
      setUserId(uid);
      setUserRole(role);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await get(ref(db, `mascotas/${id}`));
        if (snap.exists()) {
          setMascota(snap.val() as Mascota);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const eliminar = () => setShowBajaModal(true);

  const handleBaja = async (tipo: "adoptado_app" | "adoptado_externo" | "eliminar") => {
    setShowBajaModal(false);

    if (tipo === "eliminar") {
      Alert.alert(
        "Eliminar registro",
        `¿Confirmas eliminar el registro de ${mascota?.nombre}? Esta acción no se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              setDeleting(true);
              try {
                await remove(ref(db, `mascotas/${id}`));
                router.back();
              } catch {
                Alert.alert("Error", "No se pudo eliminar la mascota.");
                setDeleting(false);
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      tipo === "adoptado_app" ? "Adopción por la app" : "Adopción externa",
      `¿Confirmas que ${mascota?.nombre} fue adoptado?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setDeleting(true);
            try {
              const adopcionRef = push(ref(db, "adopciones"));
              await set(adopcionRef, {
                idMascota: id,
                idUsuario: mascota!.idUsuario,
                tipoAnimal: mascota!.tipoAnimal,
                nombreMascota: mascota!.nombre,
                via: tipo === "adoptado_app" ? "app" : "externo",
                fechaAdopcion: new Date().toISOString(),
              } as Adopcion);
              await remove(ref(db, `mascotas/${id}`));
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo registrar la adopción.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Cargando…", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !mascota) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Mascota", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
        <Text style={styles.errorText}>No se encontró la mascota.</Text>
      </View>
    );
  }

  const esOwner = userId === mascota.idUsuario;
  const enfermedades = mascota.enfermedades ? Object.values(mascota.enfermedades) : [];
  const vacunas = mascota.vacunas ? Object.values(mascota.vacunas) : [];
  const fotos = mascota.fotos ? Object.values(mascota.fotos) : [];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: mascota.nombre,
          headerShown: true,
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "bold" },
          ...(esOwner && {
            headerRight: () => (
              <Pressable onPress={eliminar} style={{ marginRight: 12 }} disabled={deleting}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            ),
          }),
        }}
      />

      {/* Visor de foto en pantalla completa */}
      <Modal
        visible={!!fotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoViewer(null)}
      >
        <View style={styles.viewerBg}>
          <Pressable style={styles.viewerClose} onPress={() => setFotoViewer(null)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </Pressable>
          {fotoViewer && (
            <>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.viewerContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: fotoViewer.fotos[fotoViewer.index] }}
                  style={styles.viewerImg}
                  resizeMode="contain"
                />
              </ScrollView>
              {fotoViewer.fotos.length > 1 && (
                <View style={styles.viewerNav}>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) => f && f.index > 0 ? { ...f, index: f.index - 1 } : f)
                    }
                  >
                    <Ionicons
                      name="chevron-back"
                      size={36}
                      color={fotoViewer.index > 0 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                  <Text style={styles.viewerCounter}>
                    {fotoViewer.index + 1} / {fotoViewer.fotos.length}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) =>
                        f && f.index < f.fotos.length - 1 ? { ...f, index: f.index + 1 } : f
                      )
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={36}
                      color={fotoViewer.index < fotoViewer.fotos.length - 1 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Modal de baja */}
      <Modal
        visible={showBajaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBajaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBajaModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>¿Qué pasó con {mascota?.nombre}?</Text>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("adoptado_app")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="phone-portrait-outline" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Adoptado por la app</Text>
                <Text style={styles.modalOptionDesc}>La adopción fue gestionada por RedPatitas</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("adoptado_externo")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="home-outline" size={24} color="#4F6D7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Adoptado externamente</Text>
                <Text style={styles.modalOptionDesc}>La familia llegó directo al refugio</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("eliminar")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: "#EF4444" }]}>Eliminar registro</Text>
                <Text style={styles.modalOptionDesc}>Error, duplicado u otra razón</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalCancel} onPress={() => setShowBajaModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Galería de fotos o banner con ícono */}
      {fotos.length > 0 ? (
        <FlatList
          data={fotos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setFotoViewer({ fotos, index })}>
              <Image source={{ uri: item }} style={styles.foto} />
            </Pressable>
          )}
          scrollEnabled={fotos.length > 1}
        />
      ) : (
        <View style={styles.iconBanner}>
          <Ionicons name="paw" size={64} color={colors.accent} />
        </View>
      )}

      {/* Nombre y especie */}
      <View style={styles.nameBanner}>
        <Text style={styles.nombreGrande}>{mascota.nombre}</Text>
        <Text style={styles.subtitulo}>{mascota.tipoAnimal} · {mascota.raza}</Text>
      </View>

      {/* Datos generales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información general</Text>
        <Fila styles={styles} label="Sexo" valor={mascota.sexo} />
        <Fila styles={styles} label="Edad" valor={`${mascota.edad} ${mascota.edad === 1 ? "año" : "años"}`} />
        <Fila styles={styles} label="Peso" valor={`${mascota.peso} kg`} />
        <Fila styles={styles} label="Esterilizado" valor={mascota.esterilizado} />
        {mascota.fechaNacimiento ? (
          <Fila styles={styles} label="Fecha de nacimiento" valor={mascota.fechaNacimiento} />
        ) : null}
      </View>

      {/* Comportamiento */}
      {mascota.comportamiento ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comportamiento</Text>
          <Text style={styles.texto}>{mascota.comportamiento}</Text>
        </View>
      ) : null}

      {/* Rasgos particulares */}
      {mascota.rasgosParticulares ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rasgos particulares</Text>
          <Text style={styles.texto}>{mascota.rasgosParticulares}</Text>
        </View>
      ) : null}

      {/* Vacunas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vacunas</Text>
        {vacunas.length > 0 ? (
          vacunas.map((v, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.chipText}>{v}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin vacunas registradas.</Text>
        )}
      </View>

      {/* Enfermedades */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enfermedades / Condiciones</Text>
        {enfermedades.length > 0 ? (
          enfermedades.map((e, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="medkit-outline" size={16} color="#F59E0B" />
              <Text style={styles.chipText}>{e}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin condiciones registradas.</Text>
        )}
      </View>

      {/* Eliminar (solo dueño) */}
      {esOwner && (
        <Pressable
          style={[styles.btnEliminar, deleting && { opacity: 0.6 }]}
          onPress={eliminar}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.btnEliminarText}>Eliminar mascota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 30 },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    errorText: { color: colors.danger, fontSize: 16, marginTop: 12 },
    foto: { width, height: 260, resizeMode: "cover" },
    iconBanner: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      height: 140,
      elevation: 2,
    },
    nameBanner: {
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingVertical: 16,
      paddingBottom: 20,
      marginBottom: 12,
      elevation: 2,
    },
    nombreGrande: { fontSize: 26, fontWeight: "bold", color: colors.text },
    subtitulo: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: "bold", color: colors.accent, marginBottom: 10 },
    fila: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filaLabel: { fontSize: 14, color: colors.textSecondary },
    filaValor: { fontSize: 14, fontWeight: "600", color: colors.text },
    texto: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    textoVacio: { fontSize: 14, color: colors.textSecondary, fontStyle: "italic" },
    chipRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    chipText: { fontSize: 14, color: colors.textSecondary },
    btnEliminar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.danger,
      backgroundColor: colors.surface,
    },
    btnEliminarText: { color: colors.danger, fontWeight: "bold", fontSize: 15 },
    viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
    viewerClose: { position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 },
    viewerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
    viewerImg: { width, height: height * 0.75 },
    viewerNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 16,
    },
    viewerCounter: { color: "#FFF", fontSize: 16 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    modalOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOptionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    modalOptionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalCancel: {
      marginTop: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalCancelText: { fontSize: 15, fontWeight: "bold", color: colors.accent },
  });
