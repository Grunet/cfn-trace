FROM gitpod/workspace-full

USER gitpod

# install deno
# version below is duplicated in Github Workflow files
RUN curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.20.3
RUN /home/gitpod/.deno/bin/deno completions bash > /home/gitpod/.bashrc.d/90-deno && echo 'export DENO_INSTALL="/home/gitpod/.deno"' >> /home/gitpod/.bashrc.d/90-deno &&     echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> /home/gitpod/.bashrc.d/90-deno

#install zx
# version below is duplicated in Github Workflow files
RUN npm i -g zx@6.0.7

#install cosign
# version below is duplicated in Github Workflow files
RUN wget "https://github.com/sigstore/cosign/releases/download/v1.6.0/cosign-linux-amd64"
RUN mv cosign-linux-amd64 /home/gitpod/.cosign/bin/cosign && echo 'export PATH=/home/gitpod/.cosign/bin/:$PATH'
RUN chmod +x /home/gitpod/.cosign/bin/cosign