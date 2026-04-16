#!/bin/bash

# 0. Cek remote & Sinkronisasi
git pull origin main --rebase
git fetch --tags  # <--- IKI KUNCINE BEN ORA REUNI v0.1.0

# 1. Ambil tag terakhir
LAST_TAG=$(git tag --sort=-v:refname | head -n 1)

# 2. Logika Versi (Nek LAST_TAG kosong lagi dadi v0.1.0)
if [ -z "$LAST_TAG" ]; then
    NEW_TAG="v0.1.0"
else
    PREFIX=$(echo $LAST_TAG | cut -d. -f1-2)
    PATCH=$(echo $LAST_TAG | cut -d. -f3)
    NEW_TAG="${PREFIX}.$((PATCH + 1))"
fi

echo "🚀 Target Tag Baru: $NEW_TAG"

# 3. Git Process
git add .
echo "Pesan commit (Enter untuk 'Hokireceh...! ft Sepi Bukan Sapi'):"
read msg
if [ -z "$msg" ]; then msg="Hokireceh...! ft Sepi Bukan Sapi"; fi

if git commit -m "$msg"; then
  echo "✅ Commit berhasil"
else
  echo "⚠️ Tidak ada yang di-commit, lanjut push..."
fi

git push origin main || { echo "❌ Push gagal."; exit 1; }

# 4. Bikin Tag & Push
git tag -a "$NEW_TAG" -m "$msg"
git push origin "$NEW_TAG" || { echo "❌ Push tag gagal."; git tag -d "$NEW_TAG"; exit 1; }

echo "✅ Beres, cok! Sekarang mulai lagi dari $NEW_TAG"