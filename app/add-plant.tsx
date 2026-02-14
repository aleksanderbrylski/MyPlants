import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { addPlant, updatePlant, uploadPlantImage } from '@/lib/firestore';

export default function AddPlantScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [watering, setWatering] = useState('');
  const [fertilization, setFertilization] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to add a plant image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedWatering = watering.trim();
    if (!trimmedName || !trimmedWatering) {
      Alert.alert('Missing fields', 'Please enter a plant name and watering rules.');
      return;
    }
    if (!user?.uid) return;

    setSaving(true);
    try {
      const plantId = await addPlant(user.uid, {
        name: trimmedName,
        watering: trimmedWatering,
        fertilization: fertilization.trim() || undefined,
      });

      if (imageUri) {
        const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const imageUrl = await uploadPlantImage(user.uid, plantId, imageUri, mimeType);
        await updatePlant(user.uid, plantId, { imageUrl });
      }

      router.replace('/garden');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save plant.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1b3b2f" />
          </TouchableOpacity>
          <Text style={styles.title}>New Plant</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                <Text style={styles.imagePlaceholderText}>Add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.label}>Plant name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Monstera"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Watering rules</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Every 2 days when dry, or Water weekly"
              value={watering}
              onChangeText={setWatering}
              multiline
            />

            <Text style={styles.label}>Fertilization rules (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Every 4 weeks during growing season"
              value={fertilization}
              onChangeText={setFertilization}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    minWidth: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 24,
    alignSelf: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  form: {
    gap: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 48,
    textAlignVertical: 'top',
  },
});
