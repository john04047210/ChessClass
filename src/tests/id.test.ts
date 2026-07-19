import { describe, expect, it } from "vitest";
import { createUuid } from "@/lib/id";

describe("createUuid", () => {
  it("uses the browser native implementation when available", () => {
    expect(createUuid({randomUUID:()=>"native-id"})).toBe("native-id");
  });

  it("creates an RFC 4122 v4 UUID when randomUUID is unavailable", () => {
    function getRandomValues<T extends ArrayBufferView>(array:T):T {
      const bytes = new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
      bytes.forEach((_,index)=>{bytes[index]=index;}); return array;
    }
    const id = createUuid({getRandomValues});
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
