FROM gitpod/workspace-full

USER gitpod

# install deno
# version below is duplicated in Github Workflow files
RUN curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.20.3
RUN /home/gitpod/.deno/bin/deno completions bash > /home/gitpod/.bashrc.d/90-deno && echo 'export DENO_INSTALL="/home/gitpod/.deno"' >> /home/gitpod/.bashrc.d/90-deno &&     echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> /home/gitpod/.bashrc.d/90-deno