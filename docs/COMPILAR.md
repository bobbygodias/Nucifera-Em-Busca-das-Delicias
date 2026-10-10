# Compilar o aplicativo Android

O código desta publicação corresponde à versão **0.1.7-prototipo**, aprovada no aparelho. O projeto usa Java 17, Android SDK 35, Build Tools 35.0.0 e Gradle 8.10 pelo wrapper incluído.

## Preparar o ambiente

1. Instale Java 17 e o Android SDK com a plataforma 35 e Build Tools 35.0.0.
2. Configure `JAVA_HOME` e crie `android/local.properties` com `sdk.dir` apontando para o seu SDK. Esse arquivo é local e ignorado pelo Git.
3. Entre na pasta `android`.

A primeira compilação precisa de internet para obter Gradle e dependências. O jogo instalado funciona offline.

## Compilação para desenvolvimento

No Windows:

```powershell
.\gradlew.bat :app:assembleDebug
```

No Linux ou macOS:

```sh
./gradlew :app:assembleDebug
```

O resultado fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Essa compilação tem assinatura de desenvolvimento e não substitui a versão oficial instalada.

## Compilação de distribuição

Configure sua própria assinatura em `android/.signing/nucifera-release.jks` e crie `android/.signing/signing.properties`:

```properties
storePassword=SUA_SENHA_LOCAL
keyPassword=SUA_SENHA_LOCAL
```

O alias esperado é `nucifera`. A pasta inteira é ignorada pelo Git. Guarde a chave e as senhas fora do repositório público.

```powershell
.\gradlew.bat :app:assembleRelease
```

O resultado fica em `android/app/build/outputs/apk/release/app-release.apk`. Para atualizar uma instalação oficial, é necessária a mesma assinatura daquela instalação. As chaves oficiais não fazem parte deste repositório.

## Organização

O processo de compilação copia `index.html`, `game.js`, `motorcycle.js`, o logotipo e os recursos referenciados por esses arquivos. Aplica também os ajustes de layout de `android/app/src/main/game/android-layout.css`.

O pacote é `com.bobbydias.nucifera`; a versão atual usa `versionCode 8`. Os vídeos de abertura e dos três finais ficam em `assets/` e são reproduzidos por `BundledVideoPlayer`, dentro do aplicativo. O ranking fica no armazenamento local.

Para uma prévia no computador, abra `index.html` em um navegador. O ambiente Android é o destino do projeto; reprodução automática de áudio e vídeo pode se comportar de forma diferente na prévia.
