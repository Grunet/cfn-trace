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
RUN mkdir -p /home/gitpod/.cosign/bin/ && mv cosign-linux-amd64 /home/gitpod/.cosign/bin/cosign
ENV PATH=$PATH:/home/gitpod/.cosign/bin
RUN chmod +x /home/gitpod/.cosign/bin/cosign

#install aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.5.4.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN mkdir -p /home/gitpod/.aws-cli/files /home/gitpod/.aws-cli/bin/ && ./aws/install --install-dir /home/gitpod/.aws-cli/files --bin-dir /home/gitpod/.aws-cli/bin/
ENV PATH=$PATH:/home/gitpod/.aws-cli/bin/
RUN rm awscliv2.zip

#install Cloudformation template tools
RUN pip install cfn-lint 
#gem doesn't appear to be available at this point (though it seems like gitpod/workspace-full should make it so), hence this workaround
# RUN gem install cfn-nag
RUN mkdir -p /home/gitpod/.cfn-nag/bin/
COPY --from=stelligent/cfn_nag:0.8.9 /usr/local/bundle/bin/cfn_nag /home/gitpod/.cfn-nag/bin/
ENV PATH=$PATH:/home/gitpod/.cfn-nag/bin/