#!/bin/bash

# Test data - simulate project/repo/phase combinations
declare -A test_data

test_data["nephio-project"]="|
| [nephio](https://github.com/nephio-project/nephio) | Active |
| [nephio-docs](https://github.com/nephio-project/nephio-docs) | Stable |"

test_data["FDio"]="|
| [fdio](https://github.com/FDio/fdio) | Stable |
| [fdio-docs](https://github.com/FDio/fdio-docs) | Maintenance |"

# Test the table formatting
for project in "nephio-project" "FDio"; do
    echo "Testing project: $project"
    echo "| Repository | Phase |"
    echo "|------------|-------|"
    echo -e "${test_data[$project]}" \
      | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); if ($3 ~ /^Error|^Unknown|^Checkout Failed|^Classification Error/) print "0"$0; else print "1"$0 }' \
      | sort -t'|' -k1,1 -k2,2 -k3,3 \
      | sed 's/^.//'
    echo "---"
done
