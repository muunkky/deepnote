---
title: Running your own kernel
noIndex: false
noContent: false
---

If you need to work with different language then Python, the Jupyter ecosystem provides you with a vast selection of other kernels. You can now run them in Deepnote!

## Running a non-Python kernel with the open-source CLI

> This section answers [deepnote/deepnote#154](https://github.com/deepnote/deepnote/issues/154):
> running a notebook against a non-Python Jupyter kernel from the open-source
> `@deepnote/cli`. The Dockerfile / `DEFAULT_KERNEL_NAME` instructions further down
> are for the hosted Deepnote product; this section is for the local CLI.

The CLI runs your notebook against the **deepnote-toolkit** Jupyter server, which can
host any kernel registered in your Python environment — not just Python. Phase 1
ships the core path: select a kernel with `--kernel`, run single-language code and
markdown, and get real outputs back (including binary MIME bundles like `image/png`).

### Which languages run

Any Jupyter kernel that is **registered as a kernelspec** in the environment you point
`--python` at. A notebook that contains only **code** and **markdown** blocks runs on
any such kernel. Pure-pip kernels (no system packages) are the easiest to set up — for
example [`bash_kernel`](https://pypi.org/project/bash_kernel/). Heavier kernels such as
[`IJulia`](https://github.com/JuliaLang/IJulia.jl) (Julia) or
[`IRkernel`](https://github.com/IRkernel/IRkernel) (R) work too, provided their language
runtime and kernelspec are installed.

### Install and register a kernel

The kernel must live in the **same environment** the toolkit server runs from (the one
`--python` resolves to). Using `bash_kernel` as the worked example:

```bash
# In the venv that has deepnote-toolkit[server] installed:
pip install bash_kernel
python -m bash_kernel.install --sys-prefix     # registers the "bash" kernelspec
```

Confirm the kernelspec is registered:

```bash
jupyter kernelspec list        # should list "bash" alongside "python3"
```

### Run it

```bash
deepnote run my-notebook.deepnote --kernel bash --python path/to/venv
```

- `--kernel <name>` selects the kernelspec to launch (default: `python3`). The name must
  match a registered kernelspec exactly — it is **not** the language label.
- `--python <path>` points at the environment that has `deepnote-toolkit[server]` **and**
  your kernel installed (a venv root, a `bin/` directory, or a Python executable).
- `-o json` emits a machine-readable result for scripting/CI, including each block's
  output MIME bundles.

### What does and doesn't work on a non-Python kernel (Phase 1)

Phase 1 is honest about its limits:

- **Plain `code` and `markdown` blocks run** on the selected kernel and return their
  outputs — including rich, non-`text/plain` bundles (e.g. a bash cell that pipes a PNG
  to the kernel's `display` helper returns an `image/png`).
- **Deepnote value-add blocks hard-fail.** SQL, chart/visualization, input, and agent
  blocks are implemented as generated Python (`_dntk`-prefixed) that only runs on the
  Python kernel. On a non-Python kernel the run stops at that block with a clear error —
  `<blockType> blocks require the Python kernel; this notebook is running on '<kernel>'` —
  rather than dispatching Python to an alien kernel and failing opaquely.
- **Reactivity is bypassed.** Dependency analysis is a Python-AST analyzer, so on a
  non-Python kernel it is skipped and blocks run in their existing notebook order. The
  CLI prints `Reactivity is Python-only; running without dependency analysis (blocks run
  in order).`
- **Requesting an unregistered kernel fails legibly.** `--kernel no_such_kernel` returns
  `Kernel 'no_such_kernel' is not registered. Installed kernels: ...` (and, with
  `-o json`, `"failureCategory": "missing-kernel"`) — never an opaque server 500.

These are deliberate Phase-1 boundaries. A notebook-declared `language` field, a
`--list-kernels` discovery surface, and a configurable per-kernel startup timeout are
planned for later phases.



<Callout status="warning">
**Deepnote's support for other kernels is still in its early days.**

Some features don't work yet. This includes including the variable explorer, SQL cells, input cells, and autocomplete.
</Callout>

<Callout status="info">
Deepnote uses the environment variable `DEFAULT_KERNEL_NAME` that you set in the Dockerfile and uses it to create new notebooks with that kernel.
</Callout>

The best way to run a custom kernel is to find an existing image, for example on [Dockerhub](https://hub.docker.com/search?q=jupyter&type=image), and then set the environment variable `DEFAULT_KERNEL_NAME`. To override the default kernel, you must modify the metadata in the .ipynb file. An alternative method is to install the kernel into the default Deepnote image, see examples below.

## R kernel

In the right sidebar, pick your preferred version of R from the dropdown in the environment section. We recommended choosing the `deepnote/ir_with_libs` image. This will install R 4.2 and many common data science libraries for you (see the image details [here](https://hub.docker.com/r/deepnote/ir-with-libs)).

### Installing R packages

#### In the default R environments

You can simply use the `install.packages` and `library` commands the way you normally would.

R packages often take a long time to install. We install them to your `work` folder by setting your environment variable `R_LIBS_USER="~/work/.R/library"`, so they stay there during hardware restarts.

#### In your custom environment

If you're comfortable using your own Docker image, the preferred way would be to install the packages at build time, or pick from the large selection on Dockerhub.

## Julia kernel

Use custom Dockerfile in the environment tab, and build an image with the following code:

```bash
FROM deepnote/python:3.7

RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.6/julia-1.6.2-linux-x86_64.tar.gz && \
    tar -xvzf julia-1.6.2-linux-x86_64.tar.gz && \
    mv julia-1.6.2 /usr/lib/ && \
    ln -s /usr/lib/julia-1.6.2/bin/julia /usr/bin/julia && \
    rm julia-1.6.2-linux-x86_64.tar.gz && \
    julia  -e "using Pkg;pkg\"add IJulia\""

ENV DEFAULT_KERNEL_NAME "julia-1.6"
```

## Bash kernel

Use custom Dockerfile in the environment tab, and build an image with the following code:

```bash
FROM deepnote/python:3.7

RUN pip install --no-cache-dir notebook bash_kernel && \
  python -m bash_kernel.install
ENV DEFAULT_KERNEL_NAME "bash"
```

## Scala 2.12 kernel (Almond 0.13.2)

Use a custom Dockerfile in the environment tab, and build an image with the following code:

```bash
FROM almondsh/almond:latest

ENV DEFAULT_KERNEL_NAME "scala212"
```

## Racket kernel

Use custom Dockerfile in the environment tab, and build an image with the following code:

```bash
FROM deepnote/python:3.7

# The following snippet is licensed under MIT license
# SEE: https://github.com/jackfirth/racket-docker

RUN apt-get update && \
    apt-get install -y libzmq5 && \
    pip install --no-cache-dir notebook && \
    apt-get purge -y --auto-remove && \
    rm -rf /var/lib/apt/lists/*

ENV RACKET_INSTALLER_URL=http://mirror.racket-lang.org/installers/7.8/racket-7.8-x86_64-linux-natipkg.sh
ENV RACKET_VERSION=7.8

RUN wget --output-document=racket-install.sh -q ${RACKET_INSTALLER_URL} && \
    echo "yes\n1\n" | sh racket-install.sh --create-dir --unix-style --dest /usr/ && \
    rm racket-install.sh

ENV SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt"
ENV SSL_CERT_DIR="/etc/ssl/certs"

RUN raco setup && \
  raco pkg config --set catalogs \
    "https://download.racket-lang.org/releases/${RACKET_VERSION}/catalog/" \
    "https://pkg-build.racket-lang.org/server/built/catalog/" \
    "https://pkgs.racket-lang.org" \
    "https://planet-compats.racket-lang.org" && \
  raco pkg install --auto iracket && \
  raco iracket install

ENV DEFAULT_KERNEL_NAME "racket"
```

Thanks, [@dkvasnickajr](https://twitter.com/dkvasnickajr/status/1321901316411711490?s=20) for [sharing this](https://gist.github.com/dkvasnicka/9e7f5c516e997d3f3f00b0256755b906)!

You can [clone this project from Deepnote](https://deepnote.com/project/ead07c75-5f57-49c3-b2a9-3b1b62bd5c59#%2Fnotebook.ipynb).

## Ruby

Use custom Dockerfile in the environment tab, and build an image with the following code:

```bash
FROM deepnote/python:3.7

RUN apt-get update -qq && \
  apt-get install -y --no-install-recommends \
    libtool libffi-dev libzmq3-dev libczmq-dev \
    make ruby-full && \
  gem install ffi-rzmq && \
  gem install iruby --pre && \
  apt-get purge -y --auto-remove && \
  rm -rf /var/lib/apt/lists/*

ENV DEFAULT_KERNEL_NAME=ruby
```

Then replace the content of your 'Init' notebook with following:

```bash
!iruby register --force
```

After resetting the project state, you should be able to use Ruby in your notebooks.

### Ruby On Rails

We have[ published a tutorial](https://deepnote.com/@deepnote/Ruby-on-Rails-in-Deepnote-QF-mn5foT7y3lfI_ItXf7g) to help your run an existing Ruby on Rails project in Deepnote. One of the use cases is querying your data based on the existing ActiveRecord models, theirs scopes and relations.

##
