# 4. QUTy Playground

In addition to compiling code, the QUTy playground allows users to
provide their own emulator events and arguments.

Users interested in testing the emulator locally are encouraged to
compile the [AVR Emulator binary](https://github.com/egb202/avremu).

## Project Templates

The following ZIP files contain empty PlatformIO projects for Assembly
and C.

- [**Assembly Project**](https://github.com/egb202/egb202.github.io/raw/main/assembly.zip)
- [**C Project**](https://github.com/egb202/egb202.github.io/raw/main/c.zip)

## Events

**File:** `events.txt`

Events specify the actions that the emulator should take at specific
times during the simulation. Each event must be specified on a new line
and take the form:

```go
@time component: argument
```

where:

- `time` is a count of nanoseconds since the start of the simulation,
  in hexadecimal (no prefix).
- `component` is the name of the component of interest.
- `argument` is some action or value to be applied to the component.

On the QUTy, the following components and actions are supported:

- **UART Transmit** (**U5**)

  ```go
  @time U5: data
  ```

  where `data` is the byte to be transmitted, in hexadecimal (no prefix).

- **Pushbutton Press** (**Sn**)

  ```go
  @time Sn: PRESS
  ```

  where `1 <= n <= 4` indicates the button being pressed.

- **Pushbutton Release** (**Sn**)

  ```go
  @time Sn: RELEASE
  ```

  where `1 <= n <= 4` indicates the button being released.

- **Potentiometer Position** (**R1**)

  ```go
  @time R1: position
  ```

  where `position` is the position of the potentiometer,
  as a floating-point number, ranging from 0 to 1.

### UART Output

If the user expects UART output from the program, the UART buffer should
be **flushed** before the end of the simulation.

```go
@time U5: flush
```

If this event is not specified, the QUTy playground will automatically
place the `flush` event 1 millisecond before the end of the simulation.

## Arguments

**File:** `arguments.txt`

Emulator arguments are used to specify the behaviour of the AVR Emulator
executable at the end of the simulation. All arguments and their values
must be supplied on a new line.

The following arguments are supported:

- **Timeout** (`-t` or `--timeout`): Specify the emulation runtime limit
  in nanoseconds, as a decimal value.

  ```go
  -t
  1000000000
  ```

- **Dump Stack** (`-s` or `--dump-stack`): Dump the stack to stdout on
  termination.

  ```go
  -s
  ```

- **Dump Registers** (`-r` or `--dump-regs`): Dump working register values
  to stdout on termination.

  ```go
  -r
  ```

- **Dump Stdout** (`-o` or `--dump-stdout`): Dump the output of stdout to
  the file `stdout.txt` on termination.

  ```go
  -o
  ```

- **Debug** (`-d` or `--debug`): Enable debug output.

  ```go
  -d
  ```

If a timeout is not specified, the QUTy playground will automatically
set a timeout of 1 second.

### Immediate Termination

If the user is unsure of the time at which the program will terminate,
they should specify a large timeout and include the `break` instruction
in their code. This will cause the emulator to terminate early.

In Assembly:

```avrasm
break
```

In C:

```c
asm("break");
```

Note that this may result in the UART buffer not being flushed.

## Outputs on Gradescope

Any output to **stdout.txt** or **uart.txt** will be displayed on
Gradescope under **Standard Output** and **UART Output**, respectively.
Emulator output will be displayed under **Emulator Output**.

If any of the above files are not present, or empty, the corresponding
output will not be displayed on Gradescope.
