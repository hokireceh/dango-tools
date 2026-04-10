#!/bin/bash

# 0. Cek remote dulu
if ! git remote | grep -q .; then
    echo "❌ Tidak ada remote yang terdaftar. Tambahkan dulu dengan:"
    echo "   git remote add origin <url>"
    exit 1
fi

# 1. Ambil tag terakhir
LAST_TAG=$(git tag --sort=-v:refname | head -n 1)

# 2. Logika Mulai dari Nol
if [ -z "$LAST_TAG" ]; then
    NEW_TAG="v0.1.0"
else
    PREFIX=$(echo $LAST_TAG | cut -d. -f1-2)
    PATCH=$(echo $LAST_TAG | cut -d. -f3)
    NEW_TAG="${PREFIX}.$((PATCH + 1))"
fi

echo "🚀 Target Tag Baru: $NEW_TAG"

# 3. Git Process
git add -A
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
git push origin --tags || { echo "❌ Push tag gagal."; git tag -d "$NEW_TAG"; exit 1; }

echo "✅ Beres, cok! Sekarang mulai lagi dari $NEW_TAG"