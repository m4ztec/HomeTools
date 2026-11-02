using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeTools.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class EmailBoundHomeInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_homes_InviteCode",
                table: "homes");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "homes");

            migrationBuilder.CreateTable(
                name: "home_invitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    HomeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvitedUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    ExpiresAt = table.Column<long>(type: "INTEGER", nullable: false),
                    AcceptedAt = table.Column<long>(type: "INTEGER", nullable: true),
                    RevokedAt = table.Column<long>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_invitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_home_invitations_homes_HomeId",
                        column: x => x.HomeId,
                        principalTable: "homes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_home_invitations_users_InvitedUserId",
                        column: x => x.InvitedUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_home_invitations_HomeId_InvitedUserId",
                table: "home_invitations",
                columns: new[] { "HomeId", "InvitedUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_home_invitations_InvitedUserId",
                table: "home_invitations",
                column: "InvitedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_home_invitations_TokenHash",
                table: "home_invitations",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "home_invitations");

            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "homes",
                type: "TEXT",
                maxLength: 8,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_homes_InviteCode",
                table: "homes",
                column: "InviteCode",
                unique: true);
        }
    }
}
