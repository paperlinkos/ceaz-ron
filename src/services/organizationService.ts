import { collection, doc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Zone, Group, Church, PCF, EntityStatus } from '../types/organization';
import { generateUUID } from '../utils/uuid';
import { writeAdminAuditLog } from './userService';

const ORG_STORAGE_KEY = 'ron_organizations_cache';

interface LocalOrgCache {
  zones: Zone[];
  groups: Group[];
  churches: Church[];
  pcfs: PCF[];
}

export const DEFAULT_ZONES: Zone[] = [
  { id: 'zone-abuja-1', name: 'Abuja Zone 1', code: 'ABZ1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }
];

export const DEFAULT_GROUPS: Group[] = [
  { id: 'grp-zonal-church', zoneId: 'zone-abuja-1', name: 'Zonal Church Group', code: 'GRP-ZCG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-strategic-zonal', zoneId: 'zone-abuja-1', name: 'Strategic Group Zonal', code: 'GRP-SGZ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-heavenly-phantheon', zoneId: 'zone-abuja-1', name: 'Heavenly Phantheon Group', code: 'GRP-HPG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-dawaki', zoneId: 'zone-abuja-1', name: 'Dawaki Sub-Group', code: 'GRP-DWK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-wuye-1', zoneId: 'zone-abuja-1', name: 'Wuye Sub-Group 1', code: 'GRP-WY1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-wuye-2', zoneId: 'zone-abuja-1', name: 'Wuye Sub-Group 2', code: 'GRP-WY2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-karmo', zoneId: 'zone-abuja-1', name: 'Karmo Group', code: 'GRP-KRM', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-gwarinpa', zoneId: 'zone-abuja-1', name: 'Gwarinpa Group', code: 'GRP-GWARINPA', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-fruitful-vine', zoneId: 'zone-abuja-1', name: 'Fruitful Vine Sub-Group', code: 'GRP-FVN', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-kubwa-1', zoneId: 'zone-abuja-1', name: 'Kubwa 1 Group', code: 'GRP-KB1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-kubwa-2', zoneId: 'zone-abuja-1', name: 'Kubwa 2 Sub-Group', code: 'GRP-KB2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-bwari', zoneId: 'zone-abuja-1', name: 'Bwari Group', code: 'GRP-BWR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-new-horizon', zoneId: 'zone-abuja-1', name: 'New Horizon Group', code: 'GRP-NHR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-gwagwalada-1', zoneId: 'zone-abuja-1', name: 'Gwagwalada 1 Group', code: 'GRP-GW1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-gwagwalada-2', zoneId: 'zone-abuja-1', name: 'Gwagwalada 2 Group', code: 'GRP-GW2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-kuje', zoneId: 'zone-abuja-1', name: 'Kuje Group', code: 'GRP-KUJ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-lokogoma', zoneId: 'zone-abuja-1', name: 'Lokogoma Group', code: 'GRP-LKG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-dei-dei', zoneId: 'zone-abuja-1', name: 'Dei Dei Group', code: 'GRP-DEI', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-airport-road', zoneId: 'zone-abuja-1', name: 'Airport Road Sub-Group', code: 'GRP-APR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-byazhin', zoneId: 'zone-abuja-1', name: 'Byazhin Church', code: 'GRP-BYZ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-dutse-makaranta', zoneId: 'zone-abuja-1', name: 'Dutse Makaranta Sub-Group', code: 'GRP-DMK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-wealthy-place', zoneId: 'zone-abuja-1', name: 'Wealthy Place Church', code: 'GRP-WLP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-city-church', zoneId: 'zone-abuja-1', name: 'CE Abuja City Church', code: 'GRP-CCC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'grp-teens-church', zoneId: 'zone-abuja-1', name: 'Teens Church Group', code: 'GRP-TCG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];

export const DEFAULT_CHURCHES: Church[] = [
  // Zonal Church Group
  { id: 'ch-zonal-church-1', groupId: 'grp-zonal-church', name: 'Zonal Church 1', code: 'CH-ZNC1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-zonal-church-2', groupId: 'grp-zonal-church', name: 'Zonal Church 2', code: 'CH-ZNC2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-lingual-church', groupId: 'grp-zonal-church', name: 'Lingual Church', code: 'CH-LNG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-city-church-zonal', groupId: 'grp-zonal-church', name: 'CE City Church', code: 'CH-CCC1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Strategic Group Zonal
  { id: 'ch-ce-tasha-2', groupId: 'grp-strategic-zonal', name: 'CE Tasha 2', code: 'CH-TSH2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-fullness', groupId: 'grp-strategic-zonal', name: 'CE Fullness', code: 'CH-FLN', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-strategic-gudu', groupId: 'grp-strategic-zonal', name: 'CE Strategic Church Gudu', code: 'CH-STG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuduru', groupId: 'grp-strategic-zonal', name: 'CE Kuduru', code: 'CH-KDR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dawaki-3', groupId: 'grp-strategic-zonal', name: 'CE Dawaki 3', code: 'CH-DWK3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-life-camp', groupId: 'grp-strategic-zonal', name: 'CE Life Camp', code: 'CH-LFC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-asokoro', groupId: 'grp-strategic-zonal', name: 'CE Asokoro', code: 'CH-ASK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kagini-3', groupId: 'grp-strategic-zonal', name: 'CE Kagini 3', code: 'CH-KAG3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-giri', groupId: 'grp-strategic-zonal', name: 'CE Giri', code: 'CH-GRI', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dei-dei-3', groupId: 'grp-strategic-zonal', name: 'CE Dei Dei 3', code: 'CH-DEI3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-paipe', groupId: 'grp-strategic-zonal', name: 'CE Paipe', code: 'CH-PIP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-cbd-2', groupId: 'grp-strategic-zonal', name: 'CE CBD 2', code: 'CH-CBD2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-2', groupId: 'grp-strategic-zonal', name: 'CE Kubwa 2', code: 'CH-KBW2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kado', groupId: 'grp-strategic-zonal', name: 'CE Kado', code: 'CH-KAD1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Heavenly Phantheon Group
  { id: 'ch-ce-model-church', groupId: 'grp-heavenly-phantheon', name: 'CE Model Church', code: 'CH-MDC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-utako', groupId: 'grp-heavenly-phantheon', name: 'CE Utako', code: 'CH-UTK1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-excel', groupId: 'grp-heavenly-phantheon', name: 'CE Excel', code: 'CH-EXC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-obansajo', groupId: 'grp-heavenly-phantheon', name: 'CE Obansajo', code: 'CH-OBS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-rabah-apo', groupId: 'grp-heavenly-phantheon', name: 'CE Rabah Apo', code: 'CH-RBH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-jiwa-3', groupId: 'grp-heavenly-phantheon', name: 'CE Jiwa 3', code: 'CH-JW3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-saburi', groupId: 'grp-heavenly-phantheon', name: 'CE Saburi', code: 'CH-SBR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-utako-2', groupId: 'grp-heavenly-phantheon', name: 'CE Utako 2', code: 'CH-UTK2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kingship-centre', groupId: 'grp-heavenly-phantheon', name: 'CE Kingship Centre', code: 'CH-KSC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Dawaki Sub-Group
  { id: 'ch-ce-dawaki', groupId: 'grp-dawaki', name: 'CE Dawaki', code: 'CH-DWK1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dawaki-2', groupId: 'grp-dawaki', name: 'CE Dawaki 2', code: 'CH-DWK2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dawaki-5', groupId: 'grp-dawaki', name: 'CE Dawaki 5', code: 'CH-DWK5', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-wisdom-mopol', groupId: 'grp-dawaki', name: 'CE Wisdom Mopol Barracks', code: 'CH-WMP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Wuye Sub-Group 1
  { id: 'ch-ce-kbs', groupId: 'grp-wuye-1', name: 'CE KBS', code: 'CH-KBS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-lighthouse', groupId: 'grp-wuye-1', name: 'CE Lighthouse', code: 'CH-LTH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-koinonia', groupId: 'grp-wuye-1', name: 'CE Koinonia', code: 'CH-KOI', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kbs-2', groupId: 'grp-wuye-1', name: 'CE KBS 2', code: 'CH-KB2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kbs-3', groupId: 'grp-wuye-1', name: 'CE KBS 3', code: 'CH-KB3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Wuye Sub-Group 2
  { id: 'ch-ce-express', groupId: 'grp-wuye-2', name: 'CE Express', code: 'CH-EXP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-livingspring', groupId: 'grp-wuye-2', name: 'CE Livingspring', code: 'CH-LVS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-pacesetters', groupId: 'grp-wuye-2', name: 'CE Pacesetters', code: 'CH-PCS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Karmo Group
  { id: 'ch-ce-karmo', groupId: 'grp-karmo', name: 'CE Karmo', code: 'CH-KRM1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dape', groupId: 'grp-karmo', name: 'CE Dape', code: 'CH-DAP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-karmo-2', groupId: 'grp-karmo', name: 'CE Karmo 2', code: 'CH-KRM2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kagini', groupId: 'grp-karmo', name: 'CE Kagini', code: 'CH-KAG1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Gwarinpa Group
  { id: 'ch-ce-gwarinpa-1', groupId: 'grp-gwarinpa', name: 'CE Gwarinpa 1', code: 'CH-GWARINPA1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-precious-place', groupId: 'grp-gwarinpa', name: 'CE Precious Place', code: 'CH-PCP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-word-arena', groupId: 'grp-gwarinpa', name: 'CE Word Arena', code: 'CH-WAR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kagini-2', groupId: 'grp-gwarinpa', name: 'CE Kagini 2', code: 'CH-KAG2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-flourish', groupId: 'grp-gwarinpa', name: 'CE Flourish', code: 'CH-FLR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-karsana', groupId: 'grp-gwarinpa', name: 'CE Karsana', code: 'CH-KRS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Fruitful Vine Sub-Group
  { id: 'ch-ce-solution-arena', groupId: 'grp-fruitful-vine', name: 'CE Solution Arena', code: 'CH-SAR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-jahi', groupId: 'grp-fruitful-vine', name: 'CE Jahi', code: 'CH-JAH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kado-2', groupId: 'grp-fruitful-vine', name: 'CE Kado 2', code: 'CH-KAD2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Kubwa 1 Group
  { id: 'ch-ce-kubwa', groupId: 'grp-kubwa-1', name: 'CE Kubwa', code: 'CH-KBW1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-katampe-ext', groupId: 'grp-kubwa-1', name: 'CE Katampe Ext', code: 'CH-KTE', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-3', groupId: 'grp-kubwa-1', name: 'CE Kubwa 3', code: 'CH-KBW3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-4', groupId: 'grp-kubwa-1', name: 'CE Kubwa 4', code: 'CH-KBW4', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-5', groupId: 'grp-kubwa-1', name: 'CE Kubwa 5', code: 'CH-KBW5', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-6', groupId: 'grp-kubwa-1', name: 'CE Kubwa 6', code: 'CH-KBW6', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-8', groupId: 'grp-kubwa-1', name: 'CE Kubwa 8', code: 'CH-KBW8', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-9', groupId: 'grp-kubwa-1', name: 'CE Kubwa 9', code: 'CH-KBW9', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kubwa-10', groupId: 'grp-kubwa-1', name: 'CE Kubwa 10', code: 'CH-KBW10', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-mpape', groupId: 'grp-kubwa-1', name: 'CE Mpape', code: 'CH-MPP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-mabuchi', groupId: 'grp-kubwa-1', name: 'CE Mabuchi', code: 'CH-MBC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kaba', groupId: 'grp-kubwa-1', name: 'CE Kaba', code: 'CH-KAB', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Kubwa 2 Sub-Group
  { id: 'ch-ce-kubwa-ext', groupId: 'grp-kubwa-2', name: 'CE Kubwa Extension', code: 'CH-KBWX', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-channel-8', groupId: 'grp-kubwa-2', name: 'CE Channel 8', code: 'CH-CH8', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-guidna', groupId: 'grp-kubwa-2', name: 'CE Guidna', code: 'CH-GDN', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-grace-and-glory', groupId: 'grp-kubwa-2', name: 'CE Grace and Glory', code: 'CH-GGG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-obasanjo-road', groupId: 'grp-kubwa-2', name: 'CE Obasanjo Road', code: 'CH-OBJ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Bwari Group
  { id: 'ch-ce-bwari-main', groupId: 'grp-bwari', name: 'CE Bwari Main', code: 'CH-BWRM', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuchiko', groupId: 'grp-bwari', name: 'CE Kuchiko', code: 'CH-KCK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-piawe', groupId: 'grp-bwari', name: 'CE Piawe', code: 'CH-PIW', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-peyi', groupId: 'grp-bwari', name: 'CE Peyi', code: 'CH-PEY', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-scc', groupId: 'grp-bwari', name: 'CE SCC', code: 'CH-SCC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kogo', groupId: 'grp-bwari', name: 'CE Kogo', code: 'CH-KGO', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-lambent', groupId: 'grp-bwari', name: 'CE Lambent', code: 'CH-LMB', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-garam', groupId: 'grp-bwari', name: 'CE Garam', code: 'CH-GRM', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // New Horizon Group
  { id: 'ch-ce-ushafa', groupId: 'grp-new-horizon', name: 'CE Ushafa', code: 'CH-USH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kogo-3', groupId: 'grp-new-horizon', name: 'CE Kogo 3', code: 'CH-KGO3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dutse-zone-3', groupId: 'grp-new-horizon', name: 'CE Dutse Zone 3', code: 'CH-DTZ3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-dutse', groupId: 'grp-new-horizon', name: 'CE Dutse', code: 'CH-DTS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-guto', groupId: 'grp-new-horizon', name: 'CE Guto', code: 'CH-GTO', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Gwagwalada 1 Group
  { id: 'ch-ce-gwagwalada-1', groupId: 'grp-gwagwalada-1', name: 'CE Gwagwalada 1', code: 'CH-GWG1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-zuba', groupId: 'grp-gwagwalada-1', name: 'CE Zuba', code: 'CH-ZUB', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-gwagwalada-4', groupId: 'grp-gwagwalada-1', name: 'CE Gwagwalada 4', code: 'CH-GWG4', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-gwagwalada-7', groupId: 'grp-gwagwalada-1', name: 'CE Gwagwalada 7', code: 'CH-GWG7', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-tunga-maje', groupId: 'grp-gwagwalada-1', name: 'CE Tunga Maje', code: 'CH-TMJ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kwali', groupId: 'grp-gwagwalada-1', name: 'CE Kwali', code: 'CH-KWL', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Gwagwalada 2 Group
  { id: 'ch-ce-gwagwalada-2', groupId: 'grp-gwagwalada-2', name: 'CE Gwagwalada 2', code: 'CH-GWG2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-gwagwalada-3', groupId: 'grp-gwagwalada-2', name: 'CE Gwagwalada 3', code: 'CH-GWG3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-anagada', groupId: 'grp-gwagwalada-2', name: 'CE Anangada', code: 'CH-ANG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-gwagwalada-6', groupId: 'grp-gwagwalada-2', name: 'CE Gwagwalada 6', code: 'CH-GWG6', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-chukunku', groupId: 'grp-gwagwalada-2', name: 'CE Chukunku', code: 'CH-CHK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Kuje Group
  { id: 'ch-ce-kuje', groupId: 'grp-kuje', name: 'CE Kuje', code: 'CH-KUJ1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-2', groupId: 'grp-kuje', name: 'CE Kuje 2', code: 'CH-KUJ2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-3', groupId: 'grp-kuje', name: 'CE Kuje 3', code: 'CH-KUJ3', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-4', groupId: 'grp-kuje', name: 'CE Kuje 4', code: 'CH-KUJ4', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-5', groupId: 'grp-kuje', name: 'CE Kuje 5', code: 'CH-KUJ5', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-iddo-sarki', groupId: 'grp-kuje', name: 'CE Iddo Sarki', code: 'CH-IDS', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-6', groupId: 'grp-kuje', name: 'CE Kuje 6', code: 'CH-KUJ6', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-7', groupId: 'grp-kuje', name: 'CE Kuje 7', code: 'CH-KUJ7', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kuje-8', groupId: 'grp-kuje', name: 'CE Kuje 8', code: 'CH-KUJ8', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Lokogoma Group
  { id: 'ch-ce-lokogoma', groupId: 'grp-lokogoma', name: 'CE Lokogoma', code: 'CH-LKG1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kabusa', groupId: 'grp-lokogoma', name: 'CE Kabusa', code: 'CH-KABUSA', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-durumi', groupId: 'grp-lokogoma', name: 'CE Durumi', code: 'CH-DRM', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-apo', groupId: 'grp-lokogoma', name: 'CE Apo', code: 'CH-APO1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-apo-dutse', groupId: 'grp-lokogoma', name: 'CE Apo Dutse', code: 'CH-APD', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-wumba', groupId: 'grp-lokogoma', name: 'CE Wumba', code: 'CH-WMB', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-gbuduwyi', groupId: 'grp-lokogoma', name: 'CE Gbuduwyi', code: 'CH-GBD', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-damagaza', groupId: 'grp-lokogoma', name: 'CE Damagaza', code: 'CH-DMG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-pigbakasa', groupId: 'grp-lokogoma', name: 'CE Pigbakasa', code: 'CH-PBK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-city-of-david', groupId: 'grp-lokogoma', name: 'CE City of David', code: 'CH-COD', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-citadel-of-grace', groupId: 'grp-lokogoma', name: 'CE Citadel of Grace', code: 'CH-COG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Dei Dei Group
  { id: 'ch-ce-deidei-2', groupId: 'grp-dei-dei', name: 'CE Deidei 2', code: 'CH-DEI2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Airport Road Sub-Group
  { id: 'ch-ce-airport-road', groupId: 'grp-airport-road', name: 'CE Airport Road', code: 'CH-APR1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-airport-road-2', groupId: 'grp-airport-road', name: 'CE Airport Road 2', code: 'CH-APR2', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-airport-road-4', groupId: 'grp-airport-road', name: 'CE Airport Road 4', code: 'CH-APR4', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-kapwa', groupId: 'grp-airport-road', name: 'CE Kapwa', code: 'CH-KPW', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Dutse Makaranta Sub-Group
  { id: 'ch-ce-dutse-makaranta', groupId: 'grp-dutse-makaranta', name: 'CE Dutse Makaranta', code: 'CH-DMK1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-garki-1', groupId: 'grp-dutse-makaranta', name: 'CE Garki 1', code: 'CH-GRK1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-springtime', groupId: 'grp-dutse-makaranta', name: 'CE Springtime', code: 'CH-SPT', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-new-jerusalem', groupId: 'grp-dutse-makaranta', name: 'CE New Jerusalem', code: 'CH-NJR', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ch-ce-mbuko', groupId: 'grp-dutse-makaranta', name: 'CE Mbuko', code: 'CH-MBK', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // CE City Church
  { id: 'ch-ce-city-church', groupId: 'grp-city-church', name: 'CE City Church', code: 'CH-CCC', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Teens Church Group
  { id: 'ch-teens-church', groupId: 'grp-teens-church', name: 'Teens Church', code: 'CH-TCG', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Byazhin Church
  { id: 'ch-ce-byazhin', groupId: 'grp-byazhin', name: 'CE Byazhin', code: 'CH-BYZ', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },

  // Wealthy Place Church
  { id: 'ch-ce-wealthy-place', groupId: 'grp-wealthy-place', name: 'CE Wealthy Place', code: 'CH-WLP', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];


function getLocalOrgCache(): LocalOrgCache {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) {
      const initial: LocalOrgCache = {
        zones: DEFAULT_ZONES,
        groups: DEFAULT_GROUPS,
        churches: DEFAULT_CHURCHES,
        pcfs: [],
      };
      saveLocalOrgCache(initial);
      return initial;
    }
    const parsed: LocalOrgCache = JSON.parse(raw);
    if (!parsed.zones || parsed.zones.length === 0) parsed.zones = DEFAULT_ZONES;
    parsed.groups = (parsed.groups || []).filter((g) => g.id !== 'grp-standalone');
    let cacheChanged = false;
    const cachedGroupIds = new Set((parsed.groups || []).map((g) => g.id));
    if (!parsed.groups || DEFAULT_GROUPS.some((g) => !cachedGroupIds.has(g.id))) {
      parsed.groups = mergeGroupsWithDefaults(parsed.groups || []);
      cacheChanged = true;
    }
    const cachedChurchIds = new Set((parsed.churches || []).map((c) => c.id));
    if (!parsed.churches || DEFAULT_CHURCHES.some((c) => !cachedChurchIds.has(c.id))) {
      parsed.churches = mergeChurchesWithDefaults(parsed.churches || []);
      cacheChanged = true;
    }
    if (!parsed.pcfs) parsed.pcfs = [];
    if (cacheChanged) {
      saveLocalOrgCache(parsed);
    }
    return parsed;
  } catch {
    return {
      zones: DEFAULT_ZONES,
      groups: DEFAULT_GROUPS,
      churches: DEFAULT_CHURCHES,
      pcfs: [],
    };
  }
}

function saveLocalOrgCache(cache: LocalOrgCache) {
  try {
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Failed to save local org cache:', err);
  }
}

// ZONES
export async function getZones(): Promise<Zone[]> {
  if (!navigator.onLine) {
    const cached = getLocalOrgCache().zones;
    return cached.length > 0 ? cached : DEFAULT_ZONES;
  }
  try {
    const snapshot = await getDocs(collection(db, 'zones'));
    const zones = snapshot.docs.map((d) => d.data() as Zone);
    if (zones.length > 0) {
      const cache = getLocalOrgCache();
      cache.zones = zones;
      saveLocalOrgCache(cache);
      return zones;
    }
    return DEFAULT_ZONES;
  } catch (err) {
    console.warn('Error fetching zones from Firestore, using defaults:', err);
    const cached = getLocalOrgCache().zones;
    return cached.length > 0 ? cached : DEFAULT_ZONES;
  }
}

export async function createZone(name: string, code: string, actorId: string = 'superAdmin'): Promise<Zone> {
  const cleanCode = code.trim().toUpperCase();
  const existing = await getZones();
  if (existing.some((z) => z.code === cleanCode)) {
    throw new Error(`Zone code "${cleanCode}" already exists.`);
  }

  const nowIso = new Date().toISOString();
  const newZone: Zone = {
    id: `zone_${generateUUID()}`,
    name: name.trim(),
    code: cleanCode,
    status: 'active',
    createdAt: nowIso,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'zones', newZone.id), newZone);
  }

  const cache = getLocalOrgCache();
  cache.zones.push(newZone);
  saveLocalOrgCache(cache);

  await writeAdminAuditLog('organization_created', actorId, newZone.id, `Created Zone ${newZone.name}`);

  return newZone;
}

export async function updateZoneStatus(zoneId: string, status: EntityStatus, actorId: string = 'superAdmin'): Promise<void> {
  if (navigator.onLine) {
    await updateDoc(doc(db, 'zones', zoneId), { status });
  }
  const cache = getLocalOrgCache();
  const target = cache.zones.find((z) => z.id === zoneId);
  if (target) target.status = status;
  saveLocalOrgCache(cache);

  await writeAdminAuditLog(
    status === 'inactive' ? 'organization_deactivated' : 'organization_updated',
    actorId,
    zoneId,
    `Set Zone status to ${status}`
  );
}

export function mergeGroupsWithDefaults(customGroups: Group[]): Group[] {
  const map = new Map<string, Group>();
  for (const g of DEFAULT_GROUPS) {
    if (g.id !== 'grp-standalone') {
      map.set(g.id, g);
    }
  }
  for (const g of customGroups) {
    if (g.status === 'active' && g.id !== 'grp-standalone') {
      map.set(g.id, { ...map.get(g.id), ...g });
    }
  }
  return Array.from(map.values());
}

export function mergeChurchesWithDefaults(customChurches: Church[]): Church[] {
  const map = new Map<string, Church>();
  for (const c of DEFAULT_CHURCHES) {
    map.set(c.id, c);
  }
  for (const c of customChurches) {
    if (c.status === 'active') {
      map.set(c.id, { ...map.get(c.id), ...c });
    }
  }
  return Array.from(map.values());
}

// GROUPS
export async function getGroups(zoneId?: string): Promise<Group[]> {
  let all: Group[] = [];
  if (!navigator.onLine) {
    const cached = getLocalOrgCache().groups;
    all = mergeGroupsWithDefaults(cached);
  } else {
    try {
      const colRef = collection(db, 'groups');
      const snapshot = await getDocs(colRef);
      const groups = snapshot.docs.map((d) => d.data() as Group);
      all = mergeGroupsWithDefaults(groups);
      const cache = getLocalOrgCache();
      cache.groups = all;
      saveLocalOrgCache(cache);
    } catch (err) {
      console.warn('Error fetching groups from Firestore, using defaults:', err);
      const cached = getLocalOrgCache().groups;
      all = mergeGroupsWithDefaults(cached);
    }
  }
  return zoneId ? all.filter((g) => g.zoneId === zoneId) : all;
}

export async function createGroup(name: string, code: string, zoneId: string, actorId: string = 'superAdmin'): Promise<Group> {
  const zones = await getZones();
  const parentZone = zones.find((z) => z.id === zoneId);
  if (!parentZone) {
    throw new Error('Hierarchy Error: Selected Zone does not exist.');
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await getGroups();
  if (existing.some((g) => g.code === cleanCode && g.zoneId === zoneId)) {
    throw new Error(`Group code "${cleanCode}" already exists in this Zone.`);
  }

  const nowIso = new Date().toISOString();
  const newGroup: Group = {
    id: `group_${generateUUID()}`,
    name: name.trim(),
    code: cleanCode,
    zoneId,
    status: 'active',
    createdAt: nowIso,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'groups', newGroup.id), newGroup);
  }

  const cache = getLocalOrgCache();
  cache.groups.push(newGroup);
  saveLocalOrgCache(cache);

  await writeAdminAuditLog('organization_created', actorId, newGroup.id, `Created Group ${newGroup.name}`);

  return newGroup;
}

export async function updateGroupStatus(groupId: string, status: EntityStatus, actorId: string = 'superAdmin'): Promise<void> {
  if (navigator.onLine) {
    await updateDoc(doc(db, 'groups', groupId), { status });
  }
  const cache = getLocalOrgCache();
  const target = cache.groups.find((g) => g.id === groupId);
  if (target) target.status = status;
  saveLocalOrgCache(cache);

  await writeAdminAuditLog(
    status === 'inactive' ? 'organization_deactivated' : 'organization_updated',
    actorId,
    groupId,
    `Set Group status to ${status}`
  );
}

// CHURCHES
export async function getChurches(groupId?: string): Promise<Church[]> {
  let all: Church[] = [];
  if (!navigator.onLine) {
    const cached = getLocalOrgCache().churches;
    all = mergeChurchesWithDefaults(cached);
  } else {
    try {
      const colRef = collection(db, 'churches');
      const snapshot = await getDocs(colRef);
      const churches = snapshot.docs.map((d) => d.data() as Church);
      all = mergeChurchesWithDefaults(churches);
      const cache = getLocalOrgCache();
      cache.churches = all;
      saveLocalOrgCache(cache);
    } catch (err) {
      console.warn('Error fetching churches from Firestore, using defaults:', err);
      const cached = getLocalOrgCache().churches;
      all = mergeChurchesWithDefaults(cached);
    }
  }
  return groupId ? all.filter((c) => c.groupId === groupId) : all;
}

export async function createChurch(name: string, code: string, groupId: string, actorId: string = 'superAdmin'): Promise<Church> {
  const groups = await getGroups();
  const parentGroup = groups.find((g) => g.id === groupId);
  if (!parentGroup) {
    throw new Error('Hierarchy Error: Selected Group does not exist.');
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await getChurches();
  if (existing.some((c) => c.code === cleanCode && c.groupId === groupId)) {
    throw new Error(`Church code "${cleanCode}" already exists in this Group.`);
  }

  const nowIso = new Date().toISOString();
  const newChurch: Church = {
    id: `church_${generateUUID()}`,
    name: name.trim(),
    code: cleanCode,
    groupId,
    status: 'active',
    createdAt: nowIso,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'churches', newChurch.id), newChurch);
  }

  const cache = getLocalOrgCache();
  cache.churches.push(newChurch);
  saveLocalOrgCache(cache);

  await writeAdminAuditLog('organization_created', actorId, newChurch.id, `Created Church ${newChurch.name}`);

  return newChurch;
}

export async function updateChurchStatus(churchId: string, status: EntityStatus, actorId: string = 'superAdmin'): Promise<void> {
  if (navigator.onLine) {
    await updateDoc(doc(db, 'churches', churchId), { status });
  }
  const cache = getLocalOrgCache();
  const target = cache.churches.find((c) => c.id === churchId);
  if (target) target.status = status;
  saveLocalOrgCache(cache);

  await writeAdminAuditLog(
    status === 'inactive' ? 'organization_deactivated' : 'organization_updated',
    actorId,
    churchId,
    `Set Church status to ${status}`
  );
}

// PCFs
export async function getPCFs(churchId?: string): Promise<PCF[]> {
  if (!navigator.onLine) {
    const all = getLocalOrgCache().pcfs;
    return churchId ? all.filter((p) => p.churchId === churchId) : all;
  }
  try {
    const colRef = collection(db, 'pcfs');
    const q = churchId ? query(colRef, where('churchId', '==', churchId)) : colRef;
    const snapshot = await getDocs(q);
    const pcfs = snapshot.docs.map((d) => d.data() as PCF);
    
    const cache = getLocalOrgCache();
    if (!churchId) cache.pcfs = pcfs;
    saveLocalOrgCache(cache);
    return pcfs;
  } catch (err) {
    console.warn('Error fetching PCFs from Firestore:', err);
    const all = getLocalOrgCache().pcfs;
    return churchId ? all.filter((p) => p.churchId === churchId) : all;
  }
}

export async function createPCF(name: string, code: string, churchId: string, actorId: string = 'superAdmin'): Promise<PCF> {
  const churches = await getChurches();
  const parentChurch = churches.find((c) => c.id === churchId);
  if (!parentChurch) {
    throw new Error('Hierarchy Error: Selected Church does not exist.');
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await getPCFs();
  if (existing.some((p) => p.code === cleanCode && p.churchId === churchId)) {
    throw new Error(`PCF code "${cleanCode}" already exists in this Church.`);
  }

  const nowIso = new Date().toISOString();
  const newPCF: PCF = {
    id: `pcf_${generateUUID()}`,
    name: name.trim(),
    code: cleanCode,
    churchId,
    status: 'active',
    createdAt: nowIso,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'pcfs', newPCF.id), newPCF);
  }

  const cache = getLocalOrgCache();
  cache.pcfs.push(newPCF);
  saveLocalOrgCache(cache);

  await writeAdminAuditLog('organization_created', actorId, newPCF.id, `Created PCF ${newPCF.name}`);

  return newPCF;
}

export async function updatePCFStatus(pcfId: string, status: EntityStatus, actorId: string = 'superAdmin'): Promise<void> {
  if (navigator.onLine) {
    await updateDoc(doc(db, 'pcfs', pcfId), { status });
  }
  const cache = getLocalOrgCache();
  const target = cache.pcfs.find((p) => p.id === pcfId);
  if (target) target.status = status;
  saveLocalOrgCache(cache);

  await writeAdminAuditLog(
    status === 'inactive' ? 'organization_deactivated' : 'organization_updated',
    actorId,
    pcfId,
    `Set PCF status to ${status}`
  );
}

export async function resolvePCFHierarchy(pcfId: string): Promise<{
  pcf: PCF;
  church: Church;
  group: Group;
  zone: Zone;
}> {
  const [pcfs, churches, groups, zones] = await Promise.all([
    getPCFs(),
    getChurches(),
    getGroups(),
    getZones(),
  ]);

  const pcf = pcfs.find((p) => p.id === pcfId);
  if (!pcf) throw new Error(`Hierarchy Validation Error: PCF "${pcfId}" not found.`);

  const church = churches.find((c) => c.id === pcf.churchId);
  if (!church) throw new Error(`Hierarchy Validation Error: Parent Church for PCF "${pcf.name}" not found.`);

  const group = groups.find((g) => g.id === church.groupId);
  if (!group) throw new Error(`Hierarchy Validation Error: Parent Group for Church "${church.name}" not found.`);

  const zone = zones.find((z) => z.id === group.zoneId);
  if (!zone) throw new Error(`Hierarchy Validation Error: Parent Zone for Group "${group.name}" not found.`);

  return { pcf, church, group, zone };
}
