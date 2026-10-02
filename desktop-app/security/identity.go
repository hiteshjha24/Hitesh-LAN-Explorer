package security

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
)

const keyFile = "veda_identity.json"

type Identity struct {
	PrivateKeyHex string `json:"private_key"`
	PublicKeyHex  string `json:"public_key"`
}

// LoadOrGenerateIdentity checks if keys exist; if not, it creates them.
func LoadOrGenerateIdentity() (string, error) {
	// Try to read existing keys
	data, err := os.ReadFile(keyFile)
	if err == nil {
		var id Identity
		if err := json.Unmarshal(data, &id); err == nil {
			return id.PublicKeyHex, nil
		}
	}

	// If missing or corrupt, generate new Ed25519 keys
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return "", err
	}

	id := Identity{
		PrivateKeyHex: hex.EncodeToString(priv),
		PublicKeyHex:  hex.EncodeToString(pub),
	}
	
	data, _ = json.MarshalIndent(id, "", "  ")
	os.WriteFile(keyFile, data, 0600) // 0600 = Only this OS user can read it

	return id.PublicKeyHex, nil
}