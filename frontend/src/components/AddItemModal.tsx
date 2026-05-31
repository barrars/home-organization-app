import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Stack,
  TagsInput,
  Group,
  Box,
  Text,
  Image,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCamera, IconUpload, IconX, IconPhoto } from '@tabler/icons-react';
import {
  getCategories,
  getTags,
  findOrCreateCategory,
  findOrCreateTag,
  createItem,
  updateItem,
  uploadImage,
} from '../services/api';
import type { Item } from '../types';

type PhotoEntry = {
  id: string;
  url: string;
  file?: File;
  isLocal: boolean;
};

const getItemImages = (item: Item | undefined) => {
  if (!item) return [];
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter((url) => url?.trim());
  }
  return item.imageUrl?.trim() ? [item.imageUrl] : [];
};

interface Props {
  opened: boolean;
  onClose: () => void;
  roomId: string;
  onCreated: () => void;
  template?: Item;
  editItem?: Item;
}

const AddItemModal: React.FC<Props> = ({
  opened,
  onClose,
  roomId,
  onCreated,
  template,
  editItem,
}) => {
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const clearPhotos = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (p.isLocal) URL.revokeObjectURL(p.url);
      });
      return [];
    });
    if (uploadRef.current) uploadRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }, []);

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found?.isLocal) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  useEffect(() => {
    if (opened) {
      getCategories().then((cats) => setCategoryOptions(cats.map((c) => c.name)));
      getTags(roomId).then((tags) => setTagOptions(tags.map((t) => t.name)));
      const source = editItem ?? template;
      if (source) {
        form.setValues({
          name: source.name,
          quantity: source.quantity,
          categories: source.categories.map((c) => (typeof c === 'string' ? c : c.name)),
          tags: source.tags.map((t) => (typeof t === 'string' ? t : t.name)),
          notes: source.notes,
        });
        setPhotos(
          getItemImages(source).map((url, idx) => ({
            id: `${source._id}-${idx}`,
            url,
            isLocal: false,
          })),
        );
      }
    }
  }, [opened, roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up preview URL when modal closes
  useEffect(() => {
    if (!opened) clearPhotos();
  }, [opened, clearPhotos]);

  // Mobile virtual keyboards often don't fire keydown with a real key for comma,
  // so splitChars={[',']} silently fails. On blur we read any pending text from
  // the underlying <input> and split it ourselves — desktop is unaffected because
  // the splitChars handler already committed the tags before blur fires.
  // Mobile virtual keyboards often don't fire keydown with a real key for comma,
  // so splitChars={[',']} silently fails. On blur we read any pending text from
  // the underlying <input> and split it ourselves — desktop is unaffected because
  // the splitChars handler already committed the tags before blur fires.
  function handleTagsBlur(field: 'categories' | 'tags', e: React.FocusEvent<HTMLElement>) {
    // e.target is the inner <input> that actually lost focus
    if (!(e.target instanceof HTMLInputElement)) return;
    const raw = e.target.value.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const current: string[] = form.values[field];
    form.setFieldValue(field, Array.from(new Set([...current, ...parts])));
    // Clear the pending text so Mantine doesn't re-add it
    e.target.value = '';
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const entries: PhotoEntry[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        file,
        isLocal: true,
      };
    });

    setPhotos((prev) => [...prev, ...entries]);
    e.currentTarget.value = '';
  };

  const form = useForm({
    initialValues: {
      name: '',
      quantity: 1,
      categories: [] as string[],
      tags: [] as string[],
      notes: '',
    },
    validate: {
      name: (v) => (v.trim().length < 1 ? 'Item name is required' : null),
      quantity: (v) => (v < 1 ? 'Quantity must be at least 1' : null),
      categories: (v) => (v.length === 0 ? 'At least one category is required' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      const normalizedTags = Array.from(
        new Set(values.tags.map((t) => t.trim()).filter((t) => t.length > 0)),
      );

      const [categoryObjs, tagObjs] = await Promise.all([
        Promise.all(values.categories.map((name) => findOrCreateCategory(name))),
        Promise.all(normalizedTags.map((name) => findOrCreateTag(name))),
      ]);

      const categoryIds = categoryObjs.map((c) => c._id);
      const tagIds = tagObjs.map((t) => t._id);

      const existingImageUrls = photos.filter((p) => !p.isLocal).map((p) => p.url);
      const newImageFiles = photos.filter((p) => p.isLocal && p.file).map((p) => p.file as File);
      const uploadedImageUrls = await Promise.all(newImageFiles.map((file) => uploadImage(file)));
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

      if (editItem) {
        await updateItem(editItem._id, {
          name: values.name.trim(),
          quantity: values.quantity,
          categories: categoryIds,
          tags: tagIds,
          notes: values.notes,
          imageUrls,
        });
        notifications.show({ message: `"${values.name}" updated!`, color: 'green' });
      } else {
        await createItem({
          name: values.name.trim(),
          quantity: values.quantity,
          roomId,
          categories: categoryIds,
          tags: tagIds,
          notes: values.notes,
          imageUrls,
        });
        notifications.show({ message: `"${values.name}" added!`, color: 'green' });
      }

      getCategories().then((cats) => setCategoryOptions(cats.map((c) => c.name)));
      getTags(roomId).then((tags) => setTagOptions(tags.map((t) => t.name)));

      form.reset();
      clearPhotos();
      onCreated();
    } catch {
      notifications.show({
        message: editItem ? 'Failed to update item' : 'Failed to add item',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        editItem
          ? `Edit "${editItem.name}"`
          : template
            ? `Duplicate "${template.name}"`
            : 'Add Item'
      }
      centered
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {/* Photo picker */}
          <Box>
            <Text size="sm" fw={500} mb={6}>
              Photos{' '}
              <Text span c="dimmed" size="xs">
                (optional)
              </Text>
            </Text>
            <Group gap="xs" mb="xs">
              <Button
                variant="light"
                size="sm"
                leftSection={<IconUpload size={14} />}
                onClick={() => uploadRef.current?.click()}
              >
                Upload
              </Button>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconCamera size={14} />}
                onClick={() => cameraRef.current?.click()}
              >
                Take Photo
              </Button>
              <Button
                variant="subtle"
                size="sm"
                color="red"
                disabled={photos.length === 0}
                onClick={clearPhotos}
              >
                Clear all
              </Button>
            </Group>

            {photos.length > 0 ? (
              <Stack gap="xs">
                {/* Carousel — only shown when more than one photo */}
                {photos.length > 1 && (
                  <Carousel
                    withIndicators
                    loop
                    height={200}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                  >
                    {photos.map((photo) => (
                      <Carousel.Slide key={photo.id}>
                        <Image
                          src={photo.url}
                          h={200}
                          fit="contain"
                          style={{ background: 'var(--mantine-color-gray-1)' }}
                        />
                      </Carousel.Slide>
                    ))}
                  </Carousel>
                )}

                {/* Single image — show full-width preview */}
                {photos.length === 1 && (
                  <Image
                    src={photos[0].url}
                    radius="md"
                    h={160}
                    fit="contain"
                    style={{ background: 'var(--mantine-color-gray-1)' }}
                  />
                )}

                {/* Thumbnail strip with per-image remove buttons */}
                <Group gap="xs" wrap="wrap">
                  {photos.map((photo) => (
                    <Box key={photo.id} style={{ position: 'relative' }}>
                      <Image src={photo.url} radius="md" w={64} h={64} fit="cover" />
                      <ActionIcon
                        style={{ position: 'absolute', top: 2, right: 2 }}
                        color="red"
                        variant="filled"
                        size="xs"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <IconX size={10} />
                      </ActionIcon>
                    </Box>
                  ))}
                </Group>
              </Stack>
            ) : (
              <Box
                style={{
                  height: 44,
                  border: '2px dashed var(--mantine-color-gray-3)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPhoto size={16} color="gray" />
              </Box>
            )}
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Box>

          <Divider />

          <TextInput
            label="Item Name"
            placeholder="e.g. T-shirt, Winter jacket, Drill..."
            required
            data-autofocus
            {...form.getInputProps('name')}
          />
          <NumberInput label="Quantity" min={1} required {...form.getInputProps('quantity')} />
          <Box onBlur={(e) => handleTagsBlur('categories', e)}>
            <TagsInput
              label="Categories"
              description="Required — pick existing or type to create new. Separate with commas."
              placeholder="e.g. Clothing, Tools..."
              data={categoryOptions}
              splitChars={[',']}
              clearable
              maxDropdownHeight={150}
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('categories')}
              error={form.errors.categories}
            />
          </Box>
          <Box onBlur={(e) => handleTagsBlur('tags', e)}>
            <TagsInput
              label="Tags"
              description="Optional — separate multiple tags with commas."
              placeholder="e.g. seasonal, fragile, borrowed..."
              data={tagOptions}
              splitChars={[',']}
              clearable
              maxDropdownHeight={150}
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('tags')}
            />
          </Box>
          <Textarea
            label="Notes"
            placeholder="Optional notes..."
            rows={2}
            {...form.getInputProps('notes')}
          />
          <Button type="submit" loading={submitting}>
            {editItem ? 'Save' : 'Add Item'}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddItemModal;
