# 2.2. Assembly

## Registers

Registers can be used as operands in instructions. For example:

```avrasm
ldi r16, 0x10
```

stores the value `0x10` into register `r16`. The `r` prefix is case-insensitive,
and may also be omitted. For example, the following are equivalent:

```avrasm
ldi r16, 0x10
ldi R16, 0x10
ldi 16, 0x10
```

Omitting the `r` prefix is inadvisable, as it may lead to incorrect
interpretation of operands.

In the following code, the operand representing the register is
ambiguous, and one might incorrectly assume that the syntax for the
`ldi` instruction is `ldi K, Rd`, rather than `ldi Rd, K`.

```avrasm
ldi 16, 16
```

## Constants

Constants are used in instructions as operands. For example:

```avrasm
ldi r16, 0x10
```

stores the value `0x10` into register `r16`.

## Immediate Values

Immediate values are constants that are used as operands in instructions.
They differ from register operands in that they do not need to be
fetched from memory, and are instead encoded directly into an
instructions OP code.

In the case of some instructions, immediate values can be omitted if
they appear as the second operand in an instruction. For example:

```avrasm
ldi r16,
```

implicitly loads the value `0x00` into register `r16`.

This is inadvisable, as it leads to inconsistent and unreadable code.

## Labels

A label is a symbolic name that represents the current value of the
program counter. Labels must be unique within a program, and end with a
colon (`:`):

```avrasm
label:
```

More information can be found at [GNU binutils Documentation - Labels](https://sourceware.org/binutils/docs-2.42/as.html#Labels).

## Assembler Directives

All assembler directives have names that begin with a period/dot (`.`).
These names are case-insensitive, and usually written in lowercase.

Some common assembler directives are defined below:

- `.global symbol` is used to declare a symbol as global.
- `.section name` is used to define a section of memory.
- `.include "file"` is used to include the contents of a file.
- `.set symbol, expression` is used to define a constant symbol.

More information can be found at [GNU binutils Documentation - Assembler Directives](https://sourceware.org/binutils/docs-2.42/as.html#Pseudo-Ops).

## Memory Sections

Memory sections are used to organise various sections of a program into
memory regions.

- The `.text` section contains program instructions.
- The `.data` section contains static data.
- The `.bss` section contains uninitialised data.
- The `.eeprom` section contains data stored in EEPROM.
- The `.noinit` section contains uninitialised data which is not zeroed.
- The `.initN` sections contain startup code from reset up to the start of `main()`.
- The `.finiN` sections contain code which runs after `main()` returns or after a call to `exit()`.

More information can be found at [AVR Libc Documentation - Memory Sections](https://onlinedocs.microchip.com/pr/GUID-317042D4-BCCE-4065-BB05-AC4312DBC2C4-en-US-2/index.html?GUID-34931843-0F2B-49EE-A117-7AB61373F68D).

## Reading a HEX File

The instructions in an assembly file are translated into OP codes, which
are organised into a HEX file. The HEX file is a text file which contains
an encoded representation of the OP codes in hexadecimal format.

Consider the following program:

```avrasm
; src/main.S
.section .init0

ldi r16, 0xAB
```

This instruction is encoded as follows:

```avrasm
ldi Rd, K; 16 <= d <= 31; 0 <= K <= 255

       KKKK dddd KKKK
0b1110 1010 0000 1011 (0xEA0B)
```

As the ATtiny1626 uses Little Endian encoding, the data portion of the
HEX file will contain the bytes `0x0B` and `0xEA` in that order.

The HEX file generated at `.pio/build/QUTy/firmware.hex` contains the
following text:

```hex
:020000000FE00F
:00000001FF
```

Each record (line) in the HEX file contains the following fields:

- Start code (colon)
- Byte count (two hex digits)
- Address (four hex digits)
- Record type (two hex digits)
- Data (some number of hex digits)
- Checksum (two hex digits)

More information on the HEX file format can be found at [Intel HEX](https://en.wikipedia.org/wiki/Intel_HEX).

The following VSCode extension provides syntax highlighting for `.hex`
files: [Intel HEX format](https://marketplace.visualstudio.com/items?itemName=keroc.hex-fmt).
