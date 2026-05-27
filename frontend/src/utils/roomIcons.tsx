import React from 'react';
import {
  IconDoor,
  IconBed,
  IconBath,
  IconSofa,
  IconToolsKitchen2,
  IconCar,
  IconDesk,
  IconHanger,
  IconDumbbell,
  IconTree,
  IconBook,
  IconDeviceTv,
  IconBox,
  IconTools,
  IconMusic,
  IconPalette,
  IconSnowflake,
  IconStar,
  IconHome,
  IconPackage,
  IconShirt,
  IconPlant,
  IconWashDry,
  IconBabyCarriage,
  IconGrill,
} from '@tabler/icons-react';

export type RoomIconKey = keyof typeof ROOM_ICONS;

export const ROOM_ICONS = {
  door: IconDoor,
  bed: IconBed,
  bath: IconBath,
  sofa: IconSofa,
  kitchen: IconToolsKitchen2,
  car: IconCar,
  desk: IconDesk,
  hanger: IconHanger,
  dumbbell: IconDumbbell,
  tree: IconTree,
  book: IconBook,
  tv: IconDeviceTv,
  box: IconBox,
  tools: IconTools,
  music: IconMusic,
  palette: IconPalette,
  snowflake: IconSnowflake,
  star: IconStar,
  home: IconHome,
  package: IconPackage,
  shirt: IconShirt,
  plant: IconPlant,
  laundry: IconWashDry,
  baby: IconBabyCarriage,
  grill: IconGrill,
} as const;

export const ROOM_ICON_LABELS: Record<RoomIconKey, string> = {
  door: 'Room',
  bed: 'Bedroom',
  bath: 'Bathroom',
  sofa: 'Living Room',
  kitchen: 'Kitchen',
  car: 'Garage',
  desk: 'Office',
  hanger: 'Closet',
  dumbbell: 'Gym',
  tree: 'Garden',
  book: 'Library',
  tv: 'Entertainment',
  box: 'Storage',
  tools: 'Workshop',
  music: 'Music Room',
  palette: 'Art Room',
  snowflake: 'Basement',
  star: 'Special',
  home: 'General',
  package: 'Pantry',
  shirt: 'Wardrobe',
  plant: 'Greenhouse',
  laundry: 'Laundry',
  baby: 'Nursery',
  grill: 'Patio / BBQ',
};

interface RoomIconProps {
  iconKey?: string;
  size?: number;
  color?: string;
}

export const RoomIcon: React.FC<RoomIconProps> = ({ iconKey, size = 20, color }) => {
  const Icon = (iconKey && ROOM_ICONS[iconKey as RoomIconKey]) || IconDoor;
  return <Icon size={size} color={color} />;
};
