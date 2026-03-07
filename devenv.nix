{ pkgs, ... }:

{
  packages = with pkgs; [
    bun
    actionlint
    yamllint
    docker
    colima
    supabase-cli
  ];
}
