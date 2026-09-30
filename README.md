# Sysvar Central Frontend

Frontend administrativo da retaguarda central do Sysvar ERP.

## Papel no produto

Este repositório contém a interface Angular usada pela Central para operação administrativa e gerencial do Sysvar.

O frontend consome a API do `FernandoMurashima/sysvarbackend` e não deve concentrar regras de negócio que pertencem ao backend.

## Stack principal

- Angular 17.3
- TypeScript 5.4
- RxJS 7.8

As versões efetivas estão em `sysvar/package.json`.

## Estrutura do projeto

A aplicação Angular está em:

```text
sysvar/
```

Comandos usuais devem ser executados a partir dessa pasta.

## Relação com o Sysvar Hub

Este frontend é a retaguarda Central. A operação local da loja e o PDV do Hub pertencem ao repositório separado:

`FernandoMurashima/sysvarhub-frontend`

A Central pode administrar configurações, usuários, lojas, caixas, Hub e terminais, mas não deve duplicar a interface operacional local do Hub.

## Documentação

Documentação central e arquitetural do Projeto Sysvar fica no repositório:

`FernandoMurashima/sysvar-vault`

Pasta principal:

`takeshi/10 Projetos/Sysvar`

O README deste repositório deve permanecer como referência técnica curta do código. Regras funcionais, arquitetura transversal, decisões e runbooks pertencem ao `sysvar-vault`.

Antes de alterações relevantes, consultar a documentação vigente e o código atual da branch `main`.
