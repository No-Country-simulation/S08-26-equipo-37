export type PresentationImage = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type PresentationView = {
  machineRef: string;
  displayNameOverride: string | null;
  shortDescription: string | null;
  images: PresentationImage[];
};
