const DEFAULT_BOXES = [
  ...[1, 2, 3, 4].map((boxNumber) => ({
    boxNumber,
    boxId: `legacy-box-${boxNumber}`,
    label: `Box ${boxNumber}`,
    guestCapacity: 8,
    physicalNumber: null,
  })),
  { boxNumber: 5, boxId: 'unmapped-8-a', label: '8-guest box A', guestCapacity: 8, physicalNumber: null },
  { boxNumber: 6, boxId: 'unmapped-8-b', label: '8-guest box B', guestCapacity: 8, physicalNumber: null },
  ...['a', 'b', 'c', 'd'].map((suffix, index) => ({
    boxNumber: index + 7,
    boxId: `unmapped-10-${suffix}`,
    label: `10-guest box ${suffix.toUpperCase()}`,
    guestCapacity: 10,
    physicalNumber: null,
  })),
];

function parseConfirmedBoxes(configured = process.env.UNITED_SUITE_BOXES_JSON) {
  if (!configured) return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed) || parsed.length !== DEFAULT_BOXES.length) return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
    const ids = new Set();
    const physicalNumbers = new Set();
    let eightGuestBoxes = 0;
    let tenGuestBoxes = 0;
    for (const box of parsed) {
      if (!box || typeof box.boxId !== 'string' || !box.boxId.trim() || ids.has(box.boxId.trim())) return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
      ids.add(box.boxId.trim());
      if (Number(box.guestCapacity) === 8) eightGuestBoxes += 1;
      else if (Number(box.guestCapacity) === 10) tenGuestBoxes += 1;
      else return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
      const physicalNumber = Number(box.physicalNumber);
      if (!Number.isInteger(physicalNumber) || physicalNumber < 1 || physicalNumber > 10 || physicalNumbers.has(physicalNumber)) {
        return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
      }
      physicalNumbers.add(physicalNumber);
    }
    if (eightGuestBoxes !== 6 || tenGuestBoxes !== 4 || physicalNumbers.size !== 10) return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
    const configuredById = new Map(parsed.map((box) => [box.boxId.trim(), box]));
    const boxes = DEFAULT_BOXES.map((expected) => {
      const configuredBox = configuredById.get(expected.boxId);
      if (!configuredBox || Number(configuredBox.guestCapacity) !== expected.guestCapacity) return null;
      if (expected.boxNumber <= 4 && Number(configuredBox.physicalNumber) !== expected.boxNumber) return null;
      return {
        ...expected,
        label: typeof configuredBox.label === 'string' && configuredBox.label.trim() ? configuredBox.label.trim() : expected.label,
        physicalNumber: Number(configuredBox.physicalNumber),
      };
    });
    if (boxes.some((box) => !box)) return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
    return { boxes, mappingConfirmed: true };
  } catch {
    return { boxes: DEFAULT_BOXES, mappingConfirmed: false };
  }
}

const configuration = parseConfirmedBoxes();

module.exports = {
  UNITED_SUITE_BOXES: configuration.boxes,
  UNITED_SUITE_MAPPING_CONFIRMED: configuration.mappingConfirmed,
  parseConfirmedBoxes,
};
