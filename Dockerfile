FROM ubuntu:22.04

ARG RUNNER_VERSION="2.336.0"
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive

# Cai cac goi can thiet: curl/jq de tai va parse, git de checkout code,
# sudo vi runner script can quyen root o mot so buoc cai dat,
# build-essential/libssl-dev/libffi-dev de runner's installdependencies.sh chay duoc
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    sudo \
    ca-certificates \
    build-essential \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js/npm de chay npm install va Playwright test (ban nodejs cua Ubuntu 22.04 qua cu)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# GitHub Actions runner tu choi chay bang root, nen phai tao user rieng
RUN useradd -m runner \
    && usermod -aG sudo runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER runner
WORKDIR /home/runner

# Tai runner binary chinh thuc tu GitHub, dung dung kien truc voi may build (amd64 -> x64, arm64 -> arm64)
RUN case "${TARGETARCH}" in \
      amd64) RUNNER_ARCH=x64 ;; \
      arm64) RUNNER_ARCH=arm64 ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac \
    && curl -o actions-runner.tar.gz -L \
    https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz \
    && tar xzf actions-runner.tar.gz \
    && rm actions-runner.tar.gz

# Cai cac thu vien he thong ma runner can (.NET runtime deps)
RUN sudo ./bin/installdependencies.sh

COPY entrypoint.sh /home/runner/entrypoint.sh
USER root
RUN chmod +x /home/runner/entrypoint.sh
USER runner

ENTRYPOINT ["/home/runner/entrypoint.sh"]
