import { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Table,
  Button,
  Box,
  Alert,
} from '@cloudscape-design/components';
import { usePermissions } from '../../hooks/usePermissions';
import AddLocaleModal from './AddLocaleModal';
import AddVoiceModal from './AddVoiceModal';

// Mock data structure - will be replaced with API calls
interface Locale {
  code: string;
  name: string;
  voices: string[]; // Just store voice IDs
}

export default function Settings() {
  const { isAdmin } = usePermissions();
  const [locales, setLocales] = useState<Locale[]>([
    {
      code: 'en-US',
      name: 'English (US)',
      voices: ['Joanna', 'Matthew'],
    },
    {
      code: 'es-US',
      name: 'Spanish (US)',
      voices: ['Lupe', 'Pedro'],
    },
  ]);
  const [showAddLocaleModal, setShowAddLocaleModal] = useState(false);
  const [showAddVoiceModal, setShowAddVoiceModal] = useState(false);
  const [editingLocale, setEditingLocale] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mock function to handle adding a locale
  const handleAddLocale = (localeData: { code: string; name: string }) => {
    const newLocale: Locale = {
      ...localeData,
      voices: [],
    };
    setLocales([...locales, newLocale]);
    setShowAddLocaleModal(false);
    setHasUnsavedChanges(true);
  };

  // Mock function to handle adding a voice to a locale
  const handleAddVoice = (voiceId: string) => {
    if (!editingLocale) return;

    setLocales(
      locales.map((locale) =>
        locale.code === editingLocale
          ? { ...locale, voices: [...locale.voices, voiceId] }
          : locale
      )
    );
    setShowAddVoiceModal(false);
    setEditingLocale(null);
    setHasUnsavedChanges(true);
  };

  // Mock function to handle removing a voice
  const handleRemoveVoice = (localeCode: string, voiceId: string) => {
    setLocales(
      locales.map((locale) =>
        locale.code === localeCode
          ? { ...locale, voices: locale.voices.filter((id) => id !== voiceId) }
          : locale
      )
    );
    setHasUnsavedChanges(true);
  };

  // Mock function to handle deleting a locale
  const handleDeleteLocale = (localeCode: string) => {
    setLocales(locales.filter((locale) => locale.code !== localeCode));
    setHasUnsavedChanges(true);
  };

  // Mock function to handle saving settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to save settings
      console.log('Saving locales:', locales);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin()) {
    return (
      <Container>
        <Alert type="error">
          Access denied. Only administrators can access settings.
        </Alert>
      </Container>
    );
  }

  return (
    <SpaceBetween direction="vertical" size="l">
      {/* Header with buttons */}
      <Box float="right">
        <SpaceBetween direction="horizontal" size="xs">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!hasUnsavedChanges}
            iconName="check"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            variant="normal"
            onClick={() => setShowAddLocaleModal(true)}
            iconName="add-plus"
          >
            Add Locale
          </Button>
        </SpaceBetween>
      </Box>

      {/* Unsaved changes alert */}
      {hasUnsavedChanges && (
        <Alert type="warning">
          You have unsaved changes. Click "Save Settings" to commit your
          changes.
        </Alert>
      )}

      {/* Individual locale cards */}
      {locales.map((locale) => (
        <Container
          key={locale.code}
          header={
            <Header
              variant="h3"
              description={`Manage voices for ${locale.name}`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    onClick={() => {
                      setEditingLocale(locale.code);
                      setShowAddVoiceModal(true);
                    }}
                    iconName="add-plus"
                  >
                    Add Voice
                  </Button>
                  <Button
                    variant="normal"
                    onClick={() => handleDeleteLocale(locale.code)}
                    iconName="remove"
                  >
                    Delete Locale
                  </Button>
                </SpaceBetween>
              }
            >
              {locale.name} Voices
            </Header>
          }
        >
          <Table
            columnDefinitions={[
              {
                id: 'id',
                header: 'Voice ID',
                cell: (voiceId: string) => voiceId,
                sortingField: 'id',
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (voiceId: string) => (
                  <Button
                    variant="link"
                    onClick={() => handleRemoveVoice(locale.code, voiceId)}
                    iconName="remove"
                  >
                    Remove
                  </Button>
                ),
              },
            ]}
            items={locale.voices.sort((a, b) => a.localeCompare(b))}
            empty={
              <Box textAlign="center" color="inherit">
                <b>No voices configured</b>
                <Box variant="p" color="inherit">
                  Add voices to make them available for this locale.
                </Box>
              </Box>
            }
          />
        </Container>
      ))}

      {/* Modals */}
      <AddLocaleModal
        visible={showAddLocaleModal}
        onDismiss={() => setShowAddLocaleModal(false)}
        onSubmit={handleAddLocale}
        existingLocales={locales.map((l) => l.code)}
      />

      <AddVoiceModal
        visible={showAddVoiceModal}
        onDismiss={() => {
          setShowAddVoiceModal(false);
          setEditingLocale(null);
        }}
        onSubmit={handleAddVoice}
        localeName={locales.find((l) => l.code === editingLocale)?.name || ''}
        existingVoices={
          locales.find((l) => l.code === editingLocale)?.voices || []
        }
      />
    </SpaceBetween>
  );
}
