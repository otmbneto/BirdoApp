# -*- coding: utf-8 -*-
"""
   Escreva o sript para pegar os dados de assets usando o modulo de pipeline do projeto aqui
   regras:
    - escreva o código para ser rodado como um script python com os seguintes parâmetros:
        * output_json = caminho do json para escrever os dados na saida
        * asset_type_name = nome do tipo de asset (opcional)
"""
import sys
import json
import argparse


def get_assets_data(asset_type):
    """
        escreva a funcao para retornar um dicionario com as infos dos assets aqui
        esta função deve retornar uma lista com dicionários com estas infos:
        {
            "code": "asset_name",
            "type": "asset type",
            "id": "id do asset",
            "scenes": ["lista de cenas que usam o asset"],
            "short_name": "asset short name"
        }
        obs: esta função deve retorna uma lista sempre, se falhar em pegar dados da api da pipeline do projeto,
        retorne uma lista vazia para não quebrar o script de js que roda este.
    """
    return []


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Get Assets Pipeline Data')
    parser.add_argument('asset_type', help='Asset type')
    parser.add_argument('output_json', help='Json file to output data back to js')
    args = parser.parse_args()

    asset_type = args.asset_type
    output_json = args.output_json

    asset_data = {asset_type: get_assets_data(asset_type)}
    try:
        with open(output_json, "w") as fp:
            json.dump(asset_data, fp, encoding="UTF-8")
    except Exception as e:
        print e
        sys.exit(-1)
    sys.exit(0)