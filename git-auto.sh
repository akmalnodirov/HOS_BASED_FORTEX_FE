#!/usr/bin/env bash

git status

read -rp "Enter your current branch name: " my_branch
read -rp "Enter dev branch name: " dev_branch
read -rp "Enter commit message: " commit_msg

echo "---- Step 1: Commit changes on $my_branch ----"
git add .
git commit -m "$commit_msg"

echo "---- Step 2: Pull & rebase $my_branch ----"
git pull --rebase origin "$my_branch"
if [ $? -ne 0 ]; then
  echo "Rebase failed on $my_branch. Please resolve conflicts."
  read -rp "Have you resolved the conflicts and want to continue? (y/n): " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    git rebase --continue
  else
    echo "Exiting..."
    exit 1
  fi
fi

git push -u origin "$my_branch"

echo "---- Step 3: Update $dev_branch ----"
git checkout "$dev_branch" || exit 1
git pull --rebase origin "$dev_branch"

git checkout "$my_branch"

echo "---- Step 4: Rebase $my_branch onto $dev_branch ----"
git rebase "$dev_branch"
if [ $? -ne 0 ]; then
  echo "Conflicts detected while rebasing $my_branch onto $dev_branch."
  echo "Please fix them in your editor or terminal."

  read -rp "Have you resolved the conflicts and want to continue? (y/n): " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    git rebase --continue
    if [ $? -ne 0 ]; then
      echo "Rebase still not complete. Exiting..."
      exit 1
    fi
  else
    echo "Exiting..."
    exit 1
  fi
fi

echo "---- Step 5: Push rebased branch ----"
git push --force-with-lease origin "$my_branch"

echo "---- Step 6: Merge into $dev_branch ----"
git checkout "$dev_branch"
git merge "$my_branch"

if [ $? -ne 0 ]; then
  echo "Merge conflicts detected in $dev_branch."
  read -rp "Have you resolved the conflicts and want to continue? (y/n): " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    git commit
  else
    echo "Exiting..."
    exit 1
  fi
fi

git push -u origin "$dev_branch"

echo "---- Step 7: Switch back to $my_branch ----"
git checkout "$my_branch"

echo "All steps completed successfully."