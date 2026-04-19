import React, { useEffect, useRef, useState, type ReactNode } from 'react';
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
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addPlant,
  updatePlant,
  getPlant,
  deletePlant,
} from '@/lib/plantRepository';
import { saveImage } from '@/lib/imageStore';
import { type Plant } from '@/lib/types';

type CareCardProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children?: ReactNode;
};

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const SectionCard = ({ title, subtitle, children }: SectionCardProps) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
};

const CareCard = ({
  iconName,
  iconBgColor,
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: CareCardProps) => {
  return (
    <View style={[styles.card, !enabled && styles.cardDisabled]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={18} color="#ffffff" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          thumbColor={enabled ? '#ffffff' : '#f9fafb'}
          trackColor={{ false: '#e5e7eb', true: '#22c55e' }}
        />
      </View>
      {enabled && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
};

type SliderWithInputProps = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

const SliderWithInput = ({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  suffix = '',
  onChange,
}: SliderWithInputProps) => {
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState(String(value));
  const inputRef = useRef<TextInput>(null);

  const handlePressValue = () => {
    setInputText(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitInput = () => {
    const parsed = parseInt(inputText, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(maximumValue, Math.max(minimumValue, parsed));
      onChange(clamped);
    }
    setEditing(false);
  };

  return (
    <View style={styles.sliderRow}>
      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        minimumTrackTintColor="#22c55e"
        maximumTrackTintColor="#d1d5db"
        thumbTintColor="#22c55e"
        onValueChange={(v) => onChange(Math.round(v))}
      />
      {editing ? (
        <TextInput
          ref={inputRef}
          style={styles.sliderValueInput}
          value={inputText}
          onChangeText={setInputText}
          onBlur={commitInput}
          onSubmitEditing={commitInput}
          keyboardType="number-pad"
          selectTextOnFocus
        />
      ) : (
        <TouchableOpacity onPress={handlePressValue} style={styles.sliderValueTouchable}>
          <Text style={styles.sliderValue}>
            {value}{suffix}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function AddPlantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string }>();
  const [name, setName] = useState('');
  const [wateringMode, setWateringMode] = useState<'disabled' | 'interval'>('interval');
  const [wateringInterval, setWateringInterval] = useState(7);
  const [fertilizationIntervalDays, setFertilizationIntervalDays] = useState(14);
  const [fertilizationEveryWaterings, setFertilizationEveryWaterings] = useState(2);
  const [fertilizationMode, setFertilizationMode] = useState<
    'disabled' | 'interval' | 'with_watering'
  >('disabled');
  const [notes, setNotes] = useState('');
  const [lastWatered, setLastWatered] = useState<Date | null>(null);
  const [lastWateredText, setLastWateredText] = useState('');
  const [lastFertilized, setLastFertilized] = useState<Date | null>(null);
  const [lastFertilizedText, setLastFertilizedText] = useState('');
  const [lastSprinkled, setLastSprinkled] = useState<Date | null>(null);
  const [lastSprinkledText, setLastSprinkledText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFertilizedDatePicker, setShowFertilizedDatePicker] = useState(false);
  const [showSprinkledDatePicker, setShowSprinkledDatePicker] = useState(false);
  const [sprinklingMode, setSprinklingMode] = useState<'disabled' | 'interval'>('disabled');
  const [sprinklingIntervalDays, setSprinklingIntervalDays] = useState(7);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPlant, setLoadingPlant] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plantId = typeof params.plantId === 'string' ? params.plantId : undefined;
  const isEditing = !!plantId;

  useEffect(() => {
    const loadPlant = async () => {
      if (!plantId) return;
      setLoadingPlant(true);
      try {
        const plant = await getPlant(plantId);
        if (!plant) return;
        populateFromPlant(plant);
      } finally {
        setLoadingPlant(false);
      }
    };
    loadPlant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId]);

  const populateFromPlant = (plant: Plant) => {
    setName(plant.name ?? '');
    if (plant.imageUrl) {
      setImageUri(plant.imageUrl);
    }

    if (plant.wateringMode) {
      setWateringMode(plant.wateringMode);
    } else {
      setWateringMode('interval');
    }

    if (typeof plant.wateringIntervalDays === 'number') {
      setWateringInterval(plant.wateringIntervalDays);
    } else if (plant.watering) {
      const matched = plant.watering.match(/(\d+)/);
      setWateringInterval(matched ? Number(matched[1]) || 7 : 7);
    } else {
      setWateringInterval(7);
    }

    if (plant.fertilizationMode) {
      setFertilizationMode(plant.fertilizationMode);
      if (plant.fertilizationMode === 'interval') {
        setFertilizationIntervalDays(
          typeof plant.fertilizationIntervalDays === 'number'
            ? plant.fertilizationIntervalDays
            : 14
        );
      } else if (plant.fertilizationMode === 'with_watering') {
        setFertilizationEveryWaterings(
          typeof plant.fertilizationEveryWaterings === 'number'
            ? Math.max(2, plant.fertilizationEveryWaterings)
            : 2
        );
      }
    } else if (plant.fertilization) {
      // Backwards compatibility: infer mode from text
      const matched = plant.fertilization.match(/(\d+)/);
      const numeric = matched ? Number(matched[1]) || 1 : 1;
      if (/watering/i.test(plant.fertilization)) {
        setFertilizationMode('with_watering');
        setFertilizationEveryWaterings(numeric);
      } else {
        setFertilizationMode('interval');
        setFertilizationIntervalDays(numeric || 14);
      }
    } else {
      setFertilizationMode('disabled');
    }

    setNotes(plant.notes ?? '');
    if (plant.lastWateredAt) {
      setLastWatered(plant.lastWateredAt);
      setLastWateredText(formatDate(plant.lastWateredAt));
    } else {
      setLastWatered(null);
      setLastWateredText('');
    }

    if (plant.lastFertilizedAt) {
      setLastFertilized(plant.lastFertilizedAt);
      setLastFertilizedText(formatDate(plant.lastFertilizedAt));
    } else {
      setLastFertilized(null);
      setLastFertilizedText('');
    }

    if (plant.sprinklingMode) {
      setSprinklingMode(plant.sprinklingMode);
    } else {
      setSprinklingMode('disabled');
    }

    if (typeof plant.sprinklingIntervalDays === 'number') {
      setSprinklingIntervalDays(plant.sprinklingIntervalDays);
    } else {
      setSprinklingIntervalDays(7);
    }

    if (plant.lastSprinkledAt) {
      setLastSprinkled(plant.lastSprinkledAt);
      setLastSprinkledText(formatDate(plant.lastSprinkledAt));
    } else {
      setLastSprinkled(null);
      setLastSprinkledText('');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setLastWatered(selectedDate);
      setLastWateredText(formatDate(selectedDate));
    }
  };

  const pickImage = () => {
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Photo library', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a plant photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
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
    if (!trimmedName) {
      Alert.alert('Missing fields', 'Please enter a plant name.');
      return;
    }

    const lastWateredDate = lastWatered ?? undefined;
    const lastFertilizedDate = lastFertilized ?? undefined;
    const lastSprinkledDate = lastSprinkled ?? undefined;

    setSaving(true);
    try {
      let wateringIntervalDaysValue: number | '' | undefined;
      let lastWateredAtValue: Date | undefined;

      if (wateringMode === 'interval') {
        wateringIntervalDaysValue = wateringInterval;
        lastWateredAtValue = lastWateredDate;
      } else {
        // Clear interval when watering is disabled
        wateringIntervalDaysValue = '';
        lastWateredAtValue = undefined;
      }

      let fertilizationIntervalDaysValue: number | '' | undefined;
      let fertilizationEveryWateringsValue: number | '' | undefined;
      let lastFertilizedAtValue: Date | undefined;

      if (fertilizationMode === 'interval') {
        fertilizationIntervalDaysValue = fertilizationIntervalDays;
        // Clear with-watering field when using interval mode
        fertilizationEveryWateringsValue = '';
        lastFertilizedAtValue = lastFertilizedDate;
      } else if (fertilizationMode === 'with_watering') {
        fertilizationEveryWateringsValue = fertilizationEveryWaterings;
        // Clear interval field when using with-watering mode
        fertilizationIntervalDaysValue = '';
        lastFertilizedAtValue = lastFertilizedDate;
      } else {
        // Disabled: clear both schedule fields
        fertilizationIntervalDaysValue = '';
        fertilizationEveryWateringsValue = '';
        lastFertilizedAtValue = undefined;
      }

      let sprinklingIntervalDaysValue: number | '' | undefined;
      let lastSprinkledAtValue: Date | undefined;

      if (sprinklingMode === 'interval') {
        sprinklingIntervalDaysValue = sprinklingIntervalDays;
        lastSprinkledAtValue = lastSprinkledDate;
      } else {
        // Disabled: clear interval field
        sprinklingIntervalDaysValue = '';
        lastSprinkledAtValue = undefined;
      }

      const baseData = {
        name: trimmedName,
        fertilizationMode,
        wateringMode,
        sprinklingMode,
        wateringIntervalDays: wateringIntervalDaysValue,
        fertilizationIntervalDays: fertilizationIntervalDaysValue,
        fertilizationEveryWaterings: fertilizationEveryWateringsValue,
        sprinklingIntervalDays: sprinklingIntervalDaysValue,
        notes: notes.trim() || '',
        lastWateredAt: lastWateredAtValue,
        lastFertilizedAt: lastFertilizedAtValue,
        lastSprinkledAt: lastSprinkledAtValue,
      };

      if (isEditing && plantId) {
        await updatePlant(plantId, baseData);

        if (imageUri && !imageUri.startsWith('http') && !imageUri.startsWith('file://')) {
          const savedUri = await saveImage(imageUri);
          await updatePlant(plantId, { imageUrl: savedUri });
        }
      } else {
        const newPlantId = await addPlant(baseData);

        if (imageUri) {
          const savedUri = await saveImage(imageUri);
          await updatePlant(newPlantId, { imageUrl: savedUri });
        }
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/garden');
      }
    } catch (e) {
      console.log('error', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save plant.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!plantId) return;

    const confirmMessage =
      'Are you sure you want to delete this plant? This cannot be undone.';

    Alert.alert('Delete plant', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deletePlant(plantId);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/garden');
            }
          } catch (e) {
            console.log('error deleting plant', e);
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Could not delete plant. Please try again.'
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/garden');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="height"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1b3b2f" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Plant' : 'New Plant'}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenInner}>
            {loadingPlant ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Loading plant…</Text>
              </View>
            ) : (
              <>
                <SectionCard
                  title="Photos"
                  subtitle="Add a photo so you can easily recognize this plant."
                >
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                        <Text style={styles.imagePlaceholderText}>
                          Tap to upload a plant photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </SectionCard>

                <SectionCard
                  title="Basic Information"
                  subtitle="Give your plant a friendly name."
                >
                  <Text style={styles.label}>Plant name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Monstera Deliciosa"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </SectionCard>

                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionTitle}>Plant care</Text>
                </View>

                <CareCard
                  iconName="water-outline"
                  iconBgColor="#dcfce7"
                  title="Watering"
                  subtitle="Set how often you want to water."
                  enabled={wateringMode === 'interval'}
                  onToggle={(value) => setWateringMode(value ? 'interval' : 'disabled')}
                >
                  <Text style={styles.subLabel}>Watering interval (days)</Text>
                  <SliderWithInput
                    value={wateringInterval}
                    minimumValue={1}
                    maximumValue={30}
                    suffix="d"
                    onChange={setWateringInterval}
                  />

                  <Text style={styles.subLabel}>Last watered</Text>
                  <>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          !lastWatered && styles.dateInputPlaceholder,
                        ]}
                      >
                        {lastWatered ? formatDate(lastWatered) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={lastWatered ?? new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )}
                  </>
                </CareCard>

                <CareCard
                  iconName="leaf-outline"
                  iconBgColor="#fef9c3"
                  title="Fertilization"
                  subtitle="Keep your plant strong with regular feedings."
                  enabled={fertilizationMode !== 'disabled'}
                  onToggle={(value) => setFertilizationMode(value ? 'interval' : 'disabled')}
                >
                  <Text style={styles.subLabel}>Schedule type</Text>
                  <View style={styles.fertilizationModeRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeBadge,
                        fertilizationMode === 'interval' && styles.modeBadgeActive,
                      ]}
                      onPress={() => setFertilizationMode('interval')}
                    >
                      <Text
                        style={[
                          styles.modeBadgeText,
                          fertilizationMode === 'interval' && styles.modeBadgeTextActive,
                        ]}
                      >
                        Custom interval
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeBadge,
                        fertilizationMode === 'with_watering' && styles.modeBadgeActive,
                      ]}
                      onPress={() => setFertilizationMode('with_watering')}
                    >
                      <Text
                        style={[
                          styles.modeBadgeText,
                          fertilizationMode === 'with_watering' && styles.modeBadgeTextActive,
                        ]}
                      >
                        With watering
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {fertilizationMode === 'interval' && (
                    <>
                      <Text style={styles.subLabel}>Fertilization interval (days)</Text>
                      <SliderWithInput
                        value={fertilizationIntervalDays}
                        minimumValue={2}
                        maximumValue={30}
                        suffix="d"
                        onChange={setFertilizationIntervalDays}
                      />
                    </>
                  )}

                  {fertilizationMode === 'with_watering' && (
                    <>
                      <Text style={styles.subLabel}>Every N waterings</Text>
                      <SliderWithInput
                        value={fertilizationEveryWaterings}
                        minimumValue={2}
                        maximumValue={10}
                        onChange={setFertilizationEveryWaterings}
                      />
                    </>
                  )}

                  <Text style={styles.subLabel}>Last fertilized</Text>
                  <>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowFertilizedDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          !lastFertilized && styles.dateInputPlaceholder,
                        ]}
                      >
                        {lastFertilized ? formatDate(lastFertilized) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {showFertilizedDatePicker && (
                      <DateTimePicker
                        value={lastFertilized ?? new Date()}
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                          setShowFertilizedDatePicker(false);
                          if (selectedDate) {
                            setLastFertilized(selectedDate);
                            setLastFertilizedText(formatDate(selectedDate));
                          }
                        }}
                      />
                    )}
                  </>
                </CareCard>

                <CareCard
                  iconName="rainy-outline"
                  iconBgColor="#e0f2fe"
                  title="Misting / Sprinkling"
                  subtitle="Lightly mist leaves on a schedule."
                  enabled={sprinklingMode === 'interval'}
                  onToggle={(value) => setSprinklingMode(value ? 'interval' : 'disabled')}
                >
                  <Text style={styles.subLabel}>Sprinkling interval (days)</Text>
                  <SliderWithInput
                    value={sprinklingIntervalDays}
                    minimumValue={1}
                    maximumValue={30}
                    suffix="d"
                    onChange={setSprinklingIntervalDays}
                  />

                  <Text style={styles.subLabel}>Last misted</Text>
                  <>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowSprinkledDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          !lastSprinkled && styles.dateInputPlaceholder,
                        ]}
                      >
                        {lastSprinkled ? formatDate(lastSprinkled) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {showSprinkledDatePicker && (
                      <DateTimePicker
                        value={lastSprinkled ?? new Date()}
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                          setShowSprinkledDatePicker(false);
                          if (selectedDate) {
                            setLastSprinkled(selectedDate);
                            setLastSprinkledText(formatDate(selectedDate));
                          }
                        }}
                      />
                    )}
                  </>
                </CareCard>

                <SectionCard
                  title="Notes"
                  subtitle="Add specific care instructions, issues, or observations."
                >
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="Any special care tips, recent changes, or general notes."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </SectionCard>

                <View style={styles.footerContainer}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleBack}
                    disabled={saving || deleting}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || loadingPlant || deleting}
                    style={[
                      styles.primaryButton,
                      (saving || loadingPlant || deleting) && styles.primaryButtonDisabled,
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save plant</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {isEditing && (
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={handleDelete}
                    disabled={saving || deleting}
                    activeOpacity={0.8}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#b91c1c" />
                    ) : (
                      <Text style={styles.dangerButtonText}>Delete plant</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
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
  headerRightPlaceholder: {
    width: 70,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  screenInner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
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
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sectionHeaderSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 4,
  },
  sectionGroupHeader: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionSpacing: {
    marginTop: 24,
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#111827',
  },
  dateInputPlaceholder: {
    color: '#9ca3af',
  },
  notesInput: {
    minHeight: 96,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  cardBody: {
    marginTop: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  slider: {
    flex: 1,
  },
  sliderValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  sliderValueTouchable: {
    width: 40,
    alignItems: 'flex-end',
    marginLeft: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  sliderValueInput: {
    width: 44,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#22c55e',
    paddingVertical: 2,
  },
  fertilizationModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  modeBadgeActive: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  modeBadgeTextActive: {
    color: '#166534',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 12,
    marginBottom: 4,
  },
  footerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  dangerButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
  },
});
