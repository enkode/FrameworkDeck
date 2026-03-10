// UF2 (USB Flashing Format) parser and validator
// Spec: https://github.com/microsoft/uf2

const UF2_MAGIC_START0 = 0x0A324655; // "UF2\n"
const UF2_MAGIC_START1 = 0x9E5D5157;
const UF2_MAGIC_END    = 0x0AB16F30;
const UF2_FLAG_FAMILY  = 0x00002000;
const RP2040_FAMILY_ID = 0xE48BFF56;
const UF2_BLOCK_SIZE   = 512;

// RP2040 flash address range (2MB)
const RP2040_FLASH_START = 0x10000000;
const RP2040_FLASH_END   = 0x10200000;

export interface UF2ValidationResult {
    valid: boolean;
    error?: string;
    totalBlocks: number;
    totalPayloadBytes: number;
    familyId: number;
    isRP2040: boolean;
    startAddress: number;
    endAddress: number;
}

export function validateUF2(buffer: ArrayBuffer): UF2ValidationResult {
    const fail = (error: string): UF2ValidationResult => ({
        valid: false, error, totalBlocks: 0, totalPayloadBytes: 0,
        familyId: 0, isRP2040: false, startAddress: 0, endAddress: 0,
    });

    if (buffer.byteLength === 0) return fail('File is empty');
    if (buffer.byteLength % UF2_BLOCK_SIZE !== 0) return fail(`File size (${buffer.byteLength}) is not a multiple of 512 bytes`);

    const numBlocks = buffer.byteLength / UF2_BLOCK_SIZE;
    const view = new DataView(buffer);

    let totalPayload = 0;
    let minAddr = 0xFFFFFFFF;
    let maxAddr = 0;
    let familyId = 0;

    for (let i = 0; i < numBlocks; i++) {
        const off = i * UF2_BLOCK_SIZE;

        // Check magic numbers
        const magic0 = view.getUint32(off + 0, true);
        const magic1 = view.getUint32(off + 4, true);
        const magicEnd = view.getUint32(off + UF2_BLOCK_SIZE - 4, true);

        if (magic0 !== UF2_MAGIC_START0) return fail(`Block ${i}: invalid start magic 0 (0x${magic0.toString(16)})`);
        if (magic1 !== UF2_MAGIC_START1) return fail(`Block ${i}: invalid start magic 1 (0x${magic1.toString(16)})`);
        if (magicEnd !== UF2_MAGIC_END) return fail(`Block ${i}: invalid end magic (0x${magicEnd.toString(16)})`);

        const flags = view.getUint32(off + 8, true);
        const targetAddr = view.getUint32(off + 12, true);
        const payloadSize = view.getUint32(off + 16, true);
        const blockNo = view.getUint32(off + 20, true);
        const totalBlocksInFile = view.getUint32(off + 24, true);
        const fileFamily = view.getUint32(off + 28, true);

        // Validate block numbering
        if (blockNo !== i) return fail(`Block ${i}: block number mismatch (expected ${i}, got ${blockNo})`);
        if (totalBlocksInFile !== numBlocks) return fail(`Block ${i}: total block count mismatch (expected ${numBlocks}, got ${totalBlocksInFile})`);

        // Payload size sanity check (max 476 bytes per block)
        if (payloadSize > 476) return fail(`Block ${i}: payload size ${payloadSize} exceeds maximum 476`);

        // Track family ID
        if (flags & UF2_FLAG_FAMILY) {
            familyId = fileFamily;
        }

        // Track address range
        if (targetAddr < minAddr) minAddr = targetAddr;
        if (targetAddr + payloadSize > maxAddr) maxAddr = targetAddr + payloadSize;

        totalPayload += payloadSize;
    }

    const isRP2040 = familyId === RP2040_FAMILY_ID;

    // Warn if addresses are outside RP2040 flash range
    if (isRP2040 && (minAddr < RP2040_FLASH_START || maxAddr > RP2040_FLASH_END)) {
        return fail(`Address range 0x${minAddr.toString(16)}-0x${maxAddr.toString(16)} is outside RP2040 flash (0x10000000-0x10200000)`);
    }

    return {
        valid: true,
        totalBlocks: numBlocks,
        totalPayloadBytes: totalPayload,
        familyId,
        isRP2040,
        startAddress: minAddr,
        endAddress: maxAddr,
    };
}
