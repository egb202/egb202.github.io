---
layout: default
title: C
parent: Reference
nav_order: 3
---

# C

## Pointers

When a variable is declared, it is assigned a memory address,
where it can store data. For example,

```c
int16_t x = 0; // declare an int16_t
```

will assign the memory address `0x0000` to the variable `x`, which
occupies 2 bytes of memory. The memory layout will then look like:

```c
MEMORY LAYOUT

| 0x0000 | 0x0001 |
| <------x------> |
```

where the value of `x` is determined by the pair of addresses
`0x0000` and `0x0001`.

---

Note that on the ATtiny1626, variables are stored in SRAM, which grows
downwards from the address `0x3FFF`. For the sake of simplicity, this
document will assume memory grows upwards from the address `0x0000`, and
that data is stored in big Endian format.

---

The value of `x` can be *directly* accessed using the identifier `x`. For example:

```c
x = 5; // modify the value of x directly
```

This value can also be *indirectly* accessed via its address. This
is done using a pointer.

A pointer is a variable that contains the address of another
variable.

A pointer declaration requires knowledge of the data type which
the pointer will point to. In this case, as `x` is defined by the
type `int16_t`, one would declare a "pointer to an int16_t":

```c
int16_t *ptr; // declare a pointer to an int16_t
```

The **address-of** (`&`) unary operator can be used to retrieve the address of `x`:

```c
int16_t *ptr = &x; // assign the address of x to ptr during declaration

int16_t *ptr;
ptr = &x;          // assign the address of x to ptr after declaration
```

In memory this might look like:

```c
MEMORY LAYOUT

| 0x0000 | 0x0001 | 0x0002 | 0x0003 |
| <------x------> | <-----ptr-----> |
```

`ptr` occupies 2 bytes (16 bits) of memory because the ATtiny1626 has
64KB of memory. In other words, 16 bits are required to access any
memory location from address `0x0000` to `0xFFFF`. This is precisely why
the program counter (PC) is 16 bits wide. See [Section 7.2
Memory Map](https://ww1.microchip.com/downloads/aemDocuments/documents/MCU08/ProductDocuments/DataSheets/ATtiny1624-26-27-DataSheet-DS40002234B.pdf#page=38):

$$
\texttt{0xFFFF} = 65535 = 64\ \mathrm{K\, B} \quad \left( \mathrm{K} = 1024 \right)
$$

This pointer can now be used to *indirectly* access `x`, by dereferencing
the pointer (this is also known as indirection). The **dereference** (`*`)
unary operator can be used as follows:

```c
*ptr = 5; // modify the value of x indirectly
```

which is equivalent to:

```c
x = 5; // modify the value of x directly
```

The value of `x` can also be read indirectly:

```c
int16_t y = *ptr; // read the value of x indirectly
```

which is equivalent to:

```c
int16_t y = x; // read the value of x directly
```

To summarise:

```c
&x: 0x0000   (address of x)
 x: 5        (value of x)

&ptr: 0x0002 (address of ptr)
 ptr: 0x0000 (value of ptr)
*ptr: 5      (value at 0x0000)
```

where:

```c
& is the "address-of" unary operator
* is the "dereference" unary operator
```

It can be concluded that `&` and `*` are inverses of each other.

If the address of a peripheral or register is known in advance, the
address can be assigned to a pointer by first applying a type cast.
Note that the following code does not compile:

```c
int16_t *peripheral_address = 0xA000;
```

and will result in the following error:

```
error: incompatible integer to pointer conversion initializing 'int16_t *' with an expression of type 'int'
```

This can be resolved by casting the integer to a pointer before assignment, 
to: 

1. convert the data to the correct data type, and
2. inform the compiler that this assignment is indeed intentional.

```c
int16_t *peripheral_address = (int16_t *)0xA000;
```
